package com.convohop.android

import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import org.robolectric.shadows.ShadowNetwork
import org.robolectric.shadows.ShadowNetworkCapabilities

@RunWith(RobolectricTestRunner::class)
internal class NetworkMonitorTest {
    private val app = RuntimeEnvironment.getApplication()
    private val connectivity = checkNotNull(app.getSystemService(ConnectivityManager::class.java))
    private val monitors = ArrayList<NetworkMonitor>()

    @After
    fun close() {
        monitors.forEach(NetworkMonitor::close)
    }

    @Test
    fun startsFromTheActiveNetworksCapabilities() {
        val active = checkNotNull(connectivity.activeNetwork)
        shadowOf(connectivity).setNetworkCapabilities(active, capabilities(internet = false))
        assertFalse(monitor().online.value)
        shadowOf(connectivity).setNetworkCapabilities(active, capabilities(internet = true))
        assertTrue(monitor().online.value)
    }

    @Test
    fun followsTheDefaultNetwork() {
        val monitor = monitor()
        val callback = shadowOf(connectivity).networkCallbacks.single()
        val wifi = ShadowNetwork.newInstance(10)
        val cellular = ShadowNetwork.newInstance(11)
        callback.onAvailable(wifi)
        assertTrue(monitor.online.value)
        callback.onCapabilitiesChanged(wifi, capabilities(internet = false))
        assertFalse(monitor.online.value)
        callback.onCapabilitiesChanged(wifi, capabilities(internet = true))
        assertTrue(monitor.online.value)
        // The default moved to cellular, so losing wifi changes nothing.
        callback.onAvailable(cellular)
        callback.onLost(wifi)
        assertTrue(monitor.online.value)
        callback.onLost(cellular)
        assertFalse(monitor.online.value)
    }

    @Test
    fun closeStopsListeningAndKeepsTheLastValue() {
        val monitor = monitor()
        val callback = shadowOf(connectivity).networkCallbacks.single()
        val wifi = ShadowNetwork.newInstance(10)
        callback.onAvailable(wifi)
        monitor.close()
        monitor.close()
        assertEquals(0, shadowOf(connectivity).networkCallbacks.size)
        callback.onLost(wifi)
        assertTrue(monitor.online.value)
    }

    private fun monitor(): NetworkMonitor = NetworkMonitor(app).also { monitors += it }

    private fun capabilities(internet: Boolean): NetworkCapabilities {
        val capabilities = ShadowNetworkCapabilities.newInstance()
        if (internet) shadowOf(capabilities).addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        return capabilities
    }
}
