package com.convohop.reactnative

import com.convohop.android.push.RecipientFilter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RecipientsTest {
    private val recipient = Recipient(Ids.PROJECT, Ids.RECIPIENT)

    @Test
    fun keepsBothIdsInOneValue() {
        assertEquals("${Ids.PROJECT} ${Ids.RECIPIENT}", recipient.encode())
        assertEquals(recipient, Recipient.decode(recipient.encode()))
    }

    @Test
    fun readsOnlyWhatItWrote() {
        val values = listOf(
            null,
            "",
            Ids.PROJECT,
            "${Ids.PROJECT}  ${Ids.RECIPIENT}",
            "${Ids.PROJECT} ${Ids.RECIPIENT} ",
            "${Ids.PROJECT} ${Ids.RECIPIENT} ${Ids.RECIPIENT}",
            "${Ids.PROJECT}\t${Ids.RECIPIENT}",
            "${Ids.PROJECT.uppercase()} ${Ids.RECIPIENT}",
            "00000000-0000-0000-0000-000000000000 ${Ids.RECIPIENT}",
            "${Ids.PROJECT} {${Ids.RECIPIENT}}",
        )
        for (value in values) assertNull(value, Recipient.decode(value))
    }

    @Test
    fun acceptsOnlyTheStoredRecipient() {
        var stored: Recipient? = null
        val gate = RecipientGate({ stored }, null)

        assertFalse("nobody is stored yet", gate.accepts(Ids.RECIPIENT))
        stored = recipient
        assertTrue(gate.accepts(Ids.RECIPIENT))
        assertFalse(gate.accepts(Ids.OTHER_RECIPIENT))
        assertFalse(gate.accepts(Ids.PROJECT))
        stored = null
        assertFalse("the recipient was cleared", gate.accepts(Ids.RECIPIENT))
    }

    @Test
    fun asksTheAppsFilterOnlyAboutTheStoredRecipient() {
        val asked = ArrayList<String>()
        val gate = RecipientGate({ recipient }, RecipientFilter { asked += it; it == Ids.RECIPIENT })

        assertTrue(gate.accepts(Ids.RECIPIENT))
        assertFalse(gate.accepts(Ids.OTHER_RECIPIENT))
        assertEquals(listOf(Ids.RECIPIENT), asked)
        assertFalse(RecipientGate({ recipient }, RecipientFilter { false }).accepts(Ids.RECIPIENT))
    }
}
