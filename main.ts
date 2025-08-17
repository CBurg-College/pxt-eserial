const LOW = 0
const HIGH = 1

let g_init = false
let g_read: string[]
let g_write: string[]
g_read = []
g_write = []
let g_read_tmo = 0
let g_write_tmo = 0

let g_tx_dat: DigitalPin	// tx out data
let g_tx_rdy: DigitalPin	// tx out data valid
let g_tx_rcv: DigitalPin	// tx in  data received
let g_rx_dat: DigitalPin	// rx in  data
let g_rx_rdy: DigitalPin	// rx in  data valid
let g_rx_rcv: DigitalPin	// rx out data received

function initESerial() {
    pins.digitalWritePin(g_tx_rdy, LOW)
    pins.digitalWritePin(g_tx_rdy, LOW)
    pins.digitalWritePin(g_tx_rdy, LOW)
    g_read = []
    g_write = []
}

function writeChar(char: string) {
    let ch = char.charCodeAt(0)
    let pin: number
    for (let i = 0; i < 8; i++) {
        pin = (ch & (1 << i))
        pins.digitalWritePin(g_tx_dat, pin == 0 ? LOW : HIGH)
        pins.digitalWritePin(g_tx_rdy, HIGH)
        while (!pins.digitalReadPin(g_tx_rcv)) {
            if (control.millis() > g_write_tmo) { initESerial(); return; }
        }
        pins.digitalWritePin(g_tx_rdy, LOW)
        while (pins.digitalReadPin(g_tx_rcv)) {
            if (control.millis() > g_write_tmo) { initESerial(); return; }
        }
    }
}

function readChar(): string {
    let pin: number
    let ch = 0
    for (let i = 0; i < 8; i++) {
        while (!pins.digitalReadPin(g_rx_rdy)) {
            if (control.millis() > g_read_tmo) { initESerial(); return ""; }
        }
        pin = pins.digitalReadPin(g_rx_dat)
        ch |= (pin << i)
        pins.digitalWritePin(g_rx_rcv, HIGH)
        while (pins.digitalReadPin(g_rx_rdy)) {
            if (control.millis() > g_read_tmo) { initESerial(); return ""; }
        }
        pins.digitalWritePin(g_rx_rcv, LOW)
    }
    let ret = (ch == 0 ? "" : String.fromCharCode(ch))
    return ret
}

// write strings
basic.forever(function () {
    if (!g_init) return;
    if (g_write.length > 0) {
        g_write_tmo = control.millis() + 5000
        let str = g_write.shift()
        for (let i = 0; i < str.length; i++) {
            if (control.millis() > g_write_tmo) { initESerial(); break; }
            writeChar(str[i])
        }
        writeChar(String.fromCharCode(0))
    }
})

// read strings
basic.forever(function () {
    if (!g_init) return;
    let str = ""
    let ch = ""
    if ((pins.digitalReadPin(g_rx_rdy) == HIGH)) { // available
        g_read_tmo = control.millis() + 5000
        do {
            ch = readChar()
            str += ch
        } while (!ch.isEmpty())
        if (control.millis() <= g_read_tmo)
            g_read.push(str)
        str = ""
    }
})

class ESerial {

    setPins(tx_dat: DigitalPin,
        tx_rdy: DigitalPin,
        tx_rcv: DigitalPin,
        rx_dat: DigitalPin,
        rx_rdy: DigitalPin,
        rx_rcv: DigitalPin) {

        g_tx_dat = tx_dat
        g_tx_rdy = tx_rdy
        g_tx_rcv = tx_rcv
        g_rx_dat = rx_dat
        g_rx_rdy = rx_rdy
        g_rx_rcv = rx_rcv

        initESerial()
        g_init = true
    }

    available(): boolean {
        return (g_read.length > 0)
    }

    write(str: string) {
        g_write.push(str)
    }

    read(): string {
        if (g_read.length)
            return g_read.shift()
        return ""
    }
}
