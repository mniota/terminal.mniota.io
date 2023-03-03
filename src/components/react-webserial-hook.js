import { useEffect, useState } from "react";

/**
 * @typedef {1200 | 2400 | 4800 | 9600 | 14400 | 31250 | 38400 | 56000 | 57600 | 76800 | 115200} BaudRatesType
 * @typedef {7 | 8} DataBitsType
 * @typedef {1 | 2} StopBitsType
 */

/**
 * Debug usage
 */
const webSerialContext = {
  initialized: false,

  /**
   * @type {SerialPort | null}
   */
  port: null,

  /**
   * @type {[SerialPort]}
   */
  ports: [],

  /**
   * @type {ReadableStream<Uint8Array> | null}
   */
  readable: null
};

window.webSerialContext = webSerialContext;

/**
 *
 * @param {{
 *  onConnect?: (SerialPort) => undefined
 *  onDisconnect?: (SerialPort) => undefined
 * }}
 * @returns
 */
export function useWebSerial({ onConnect, onDisconnect }) {
  if (!navigator.serial) {
    throw Error("WebSerial is not available");
  }

  /**
   * @type {[SerialPort, React.Dispatch<React.SetStateAction<SerialPort>>]}
   */
  const [port, setPort] = useState(null);

  /**
   * @type {[[SerialPort], React.Dispatch<React.SetStateAction<[SerialPort]>>]}
   */
  const [ports, setPorts] = useState(webSerialContext.ports);

  /**
   * @type {[Boolean, React.Dispatch<React.SetStateAction<Boolean>>]}
   */
  const [isOpen, setIsOpen] = useState(false);

  /**
   * @type {[BaudRatesType, React.Dispatch<React.SetStateAction<BaudRatesType>>]}
   */
  const [baudRate, setBaudRate] = useState(115200);

  /**
   * @type {[Number, React.Dispatch<React.SetStateAction<Number>>]}
   */
  const [bufferSize, setBufferSize] = useState(255);

  /**
   * @type {[DataBitsType, React.Dispatch<React.SetStateAction<DataBitsType>>]}
   */
  const [dataBits, setDataBits] = useState(8);

  /**
   * @type {[StopBitsType, React.Dispatch<React.SetStateAction<StopBitsType>>]}
   */
  const [stopBits, setStopBits] = useState(1);

  /**
   * @type {[FlowControlType, React.Dispatch<React.SetStateAction<FlowControlType>>]}
   */
  const [flowControl, setFlowControl] = useState("none");

  /**
   * @type {[ParityType, React.Dispatch<React.SetStateAction<ParityType>>]}
   */
  const [parity, setParity] = useState("none");

  const [dataTerminalReady, setDataTerminalReady] = useState(false);
  const [requestToSend, setRequestToSend] = useState(false);
  const [breakSignal, setBreak] = useState(false);

  useEffect(() => {}, [
    baudRate,
    bufferSize,
    dataBits,
    stopBits,
    flowControl,
    parity,
  ]);

  const _onConnect = () => {
    if (onConnect) {
      onConnect();
    }
  };

  const _onDisconnect = () => {
    if (onDisconnect) {
      onDisconnect();
    }
  };

  useEffect(() => {
    navigator.serial.addEventListener("connect", _onConnect);
    navigator.serial.addEventListener("disconnect", _onDisconnect);
    return () => {
      navigator.serial.removeEventListener("connect", _onConnect);
      navigator.serial.removeEventListener("disconnect", _onDisconnect);
    };
  });

  useEffect(() => {
    if (webSerialContext.initialized) {
      return;
    }

    webSerialContext.initialized = true;

    navigator.serial.getPorts().then((ports) => {
      if (ports.length >= 1) {
        webSerialContext.ports = ports;
        setPorts(ports);
        setPort(ports[0]);
      }
    });
  }, []);

  /**
   *
   * @param {SerialPortFilter} [filters]
   */
  const requestPort = async (filters) => {
    await navigator.serial.requestPort(filters).then((port) => {
      setPort(port);
    });
  };

  /**
   *
   * @param {SerialPort} port
   */
  const portInfo = (port) => {
    const info = port.getInfo();

    return {
      usbVendorId: info.usbVendorId,
      usbProductId: info.usbProductId,
      usbId: `${info.usbVendorId
        .toString(16)
        .padStart(4, "0")}:${info.usbProductId.toString(16).padStart(4, "0")}`,
    };
  };

  const openPort = async () => {
    if (!port) {
      throw new Error("useWebSerial: No port selected");
    }

    if (port.readable) {
      throw new Error("useWebSerial: Port already opened");
    }

    await port.open({
      baudRate,
      bufferSize,
      dataBits,
      flowControl,
      parity,
      stopBits,
    });

    webSerialContext.port = port;
    webSerialContext.readable = port.readable;

    setIsOpen(true);
  };

  const closePort = async () => {
    if (!port) {
      throw new Error("useWebSerial: No port selected");
    }

    await port.close();

    setIsOpen(false);
  };

  const read = async () => {
    const port = webSerialContext.port;

    if (!port) {
      throw new Error("no port selected");
    }

    if (!port.readable) {
      throw new Error("port not opened");
    }

    try {
      const reader = port.readable.getReader();

      try {
        /**
         * @type {ReadableStreamReadResult<Uint8Array>}
         */
        let { value, done } = await reader.read();

        if (done) {
          return new Uint8Array(0);
        }

        console.log(value);
        return value;
      } finally {
        reader.releaseLock();
      }
    } catch (e) {
      console.log('Erro:', e);
    }
  };

  /**
   *
   * @param {UIntArray} data
   */
  const write = async (data) => {
    console.log(data);
    const writer = webSerialContext.port.writable.getWriter();
    try {
      await writer.write(data);
    } finally {
      writer.releaseLock();
    }
  };

  return {
    port,
    ports,
    isOpen,
    setPort,
    portInfo,
    requestPort,
    openPort,
    closePort,
    read,
    write,
    options: {
      baudRate,
      bufferSize,
      dataBits,
      stopBits,
      flowControl,
      parity,
      setBaudRate,
      setBufferSize,
      setDataBits,
      setStopBits,
      setFlowControl,
      setParity,
    },
    signals: {
      break: breakSignal,
      dataTerminalReady,
      requestToSend,
      setBreak,
      setDataTerminalReady,
      setRequestToSend,
    },
  };
}
