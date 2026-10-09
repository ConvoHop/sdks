package com.convohop.android

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.io.File

@RunWith(RobolectricTestRunner::class)
internal class SharedPreferencesRecoveryStorageTest {
    private val app = RuntimeEnvironment.getApplication()

    @Test
    fun recordsPersistPerFileUntilRemovedOrCleared() = runBlocking {
        val storage = SharedPreferencesRecoveryStorage(app, NAME)
        assertNull(storage.getItem("send:request-1"))
        storage.setItem("send:request-1", """{"state":"submitted"}""")
        storage.setItem("send:request-2", "{}")
        // Another instance over the same file sees the records; another file does not.
        val reopened = SharedPreferencesRecoveryStorage(app, NAME)
        assertEquals("""{"state":"submitted"}""", reopened.getItem("send:request-1"))
        assertNull(SharedPreferencesRecoveryStorage(app, "$NAME.other").getItem("send:request-1"))
        reopened.removeItem("send:request-1")
        assertNull(storage.getItem("send:request-1"))
        assertEquals("{}", storage.getItem("send:request-2"))
        storage.clear()
        assertNull(storage.getItem("send:request-2"))
    }

    @Test
    fun aWriteIsOnDiskWhenItReturns() = runBlocking {
        SharedPreferencesRecoveryStorage(app, NAME).setItem("send:request-1", "{}")
        // commit, not apply: the file already holds the record.
        val file = File(app.dataDir, "shared_prefs/$NAME.xml")
        assertTrue(file.readText().contains("send:request-1"))
    }

    @Test
    fun aNameMustBeAPlainFileName() {
        for (name in listOf("", " ", "a/b")) {
            val error = runCatching { SharedPreferencesRecoveryStorage(app, name) }.exceptionOrNull()
            assertTrue("Expected a rejection of '$name'", error is IllegalArgumentException)
        }
    }

    private companion object {
        const val NAME = "convohop.recovery.test"
    }
}
