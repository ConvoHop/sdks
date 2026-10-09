package com.convohop.reactnative

import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType

/** The string at [name], or null if it is missing or isn't a string. */
internal fun ReadableMap.stringOrNull(name: String): String? =
    if (hasKey(name) && getType(name) == ReadableType.String) getString(name) else null

/** The boolean at [name], or null if it is missing or isn't a boolean. */
internal fun ReadableMap.booleanOrNull(name: String): Boolean? =
    if (hasKey(name) && getType(name) == ReadableType.Boolean) getBoolean(name) else null
