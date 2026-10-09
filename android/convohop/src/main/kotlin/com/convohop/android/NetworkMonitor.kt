package com.convohop.android

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Whether the device has a default network with internet access, for
 * [ConvoHopStore][com.convohop.android.core.ConvoHopStore]'s `online`. It
 * does not wait for Android to validate the network: the SDK's own requests
 * show whether the authority is reachable. Requires `ACCESS_NETWORK_STATE`,
 * which the library declares. [close] it with the store.
 */
public class NetworkMonitor(context: Context) : AutoCloseable {
    private val connectivity: ConnectivityManager =
        checkNotNull(context.applicationContext.getSystemService(ConnectivityManager::class.java)) { "No ConnectivityManager" }
    private val lock = Any()
    private var network: Network? = null
    private var closed = false
    private val state = MutableStateFlow(initial())

    /** True while the default network has internet access. */
    public val online: StateFlow<Boolean> = state.asStateFlow()

    private val callback = object : ConnectivityManager.NetworkCallback() {
        // The default request requires internet access, so a new default network has it.
        override fun onAvailable(network: Network) {
            synchronized(lock) {
                this@NetworkMonitor.network = network
                if (!closed) state.value = true
            }
        }

        override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
            synchronized(lock) {
                this@NetworkMonitor.network = network
                update(capabilities)
            }
        }

        override fun onLost(network: Network) {
            synchronized(lock) {
                // A newer default network may already have replaced the lost one.
                if (this@NetworkMonitor.network != network) return
                this@NetworkMonitor.network = null
                if (!closed) state.value = false
            }
        }
    }

    init {
        connectivity.registerDefaultNetworkCallback(callback)
    }

    private fun initial(): Boolean = hasInternet(connectivity.activeNetwork?.let { connectivity.getNetworkCapabilities(it) })

    private fun update(capabilities: NetworkCapabilities) {
        if (!closed) state.value = hasInternet(capabilities)
    }

    private fun hasInternet(capabilities: NetworkCapabilities?): Boolean =
        capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true

    /** Stops listening; [online] keeps its last value. */
    override fun close() {
        synchronized(lock) {
            if (closed) return
            closed = true
        }
        connectivity.unregisterNetworkCallback(callback)
    }
}
