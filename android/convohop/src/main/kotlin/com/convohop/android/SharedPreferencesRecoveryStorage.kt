package com.convohop.android

import android.content.Context
import android.content.SharedPreferences
import com.convohop.android.core.ConvoHopClient
import com.convohop.android.core.RecoveryStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.IOException

/**
 * [RecoveryStorage] in a private [SharedPreferences] file. It holds request
 * identities, inputs and outcomes, never tokens. Use one file per project and
 * principal, and [clear] it when the user signs out.
 */
public class SharedPreferencesRecoveryStorage(context: Context, name: String) : RecoveryStorage {
    private val context: Context = context.applicationContext
    private val name: String = name.also { require(it.isNotBlank() && '/' !in it) { "Invalid preferences name" } }
    private val preferences: SharedPreferences by lazy { this.context.getSharedPreferences(this.name, Context.MODE_PRIVATE) }

    /** The file for [client]'s project and principal. */
    public constructor(context: Context, client: ConvoHopClient) :
        this(context, "convohop.recovery.${client.projectId}.${client.principalId}")

    override suspend fun getItem(key: String): String? = withContext(Dispatchers.IO) { preferences.getString(key, null) }

    override suspend fun setItem(key: String, value: String) {
        write { putString(key, value) }
    }

    override suspend fun removeItem(key: String) {
        write { remove(key) }
    }

    /** Deletes every record. */
    public suspend fun clear() {
        write { clear() }
    }

    private suspend fun write(change: SharedPreferences.Editor.() -> Unit) {
        withContext(Dispatchers.IO) {
            val editor = preferences.edit()
            editor.change()
            // commit, not apply: a record must be on disk before its request goes out.
            if (!editor.commit()) throw IOException("Recovery storage write failed")
        }
    }
}
