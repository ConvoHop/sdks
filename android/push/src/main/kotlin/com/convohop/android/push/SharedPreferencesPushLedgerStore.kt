package com.convohop.android.push

import android.annotation.SuppressLint
import android.content.Context

/** Keeps the [PushLedger] in this app's private shared preferences. */
internal class SharedPreferencesPushLedgerStore(context: Context) : PushLedgerStore {
    private val preferences = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    override fun load(): String? = preferences.getString(KEY, null)

    // A push may be the process's last work before Android kills it, so write synchronously.
    @SuppressLint("ApplySharedPref")
    override fun save(value: String) {
        preferences.edit().putString(KEY, value).commit()
    }

    private companion object {
        const val FILE = "com.convohop.android.push"
        const val KEY = "ledger"
    }
}
