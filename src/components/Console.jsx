import { useState, useEffect } from "react";
import * as React from "react";
import { useWebSerial } from "./react-webserial-hook";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import * as PropTypes from "prop-types";
import { Popover } from "@headlessui/react";

import { ESPLoader, Transport } from "esptool-js";

/**
 *
 * @param {{className: string}} param0
 * @returns
 */
export function Console({ className }) {
  /**
   * @type {React.MutableRefObject<{xterm: Terminal}>}
   */
  const xtermRef = React.useRef(null);

  const serial = useWebSerial({
    onConnect: port => console.log('connected', port),
    onDisconnect: port => console.log('disconnected', port)
  });

  const [termCols, setTermCols] = useState(0);
  const [termRows, setTermRows] = useState(0);

  useEffect(() => {
    if (xtermRef.current && !xtermRef.current.xterm) {
      let term = (xtermRef.current.xterm = new Terminal());
      term.fitAddon = new FitAddon();
      term.loadAddon(term.fitAddon);
      term.open(xtermRef.current);
      term.fitAddon.fit();
      setTermCols(term.cols);
      setTermRows(term.rows);
    }

    () => {
      xtermRef.current.xterm.dispose();
      delete xtermRef.current.xterm;
    };
  }, [xtermRef.current]);

  useEffect(() => {
    function handleResize() {
      let term = xtermRef.current.xterm;
      term.fitAddon.fit();
      setTermCols(term.cols);
      setTermRows(term.rows);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const listener = xtermRef.current.xterm.onData((chunk) => {
      let utf8Encode = new TextEncoder();
      serial.write(utf8Encode.encode(chunk));
    });
    return () => {
      listener.dispose()
    };
  }, [xtermRef]);

  const resetEsp = async () => {
    if (serial.isOpen) {
      await serial.port.setSignals({ dataTerminalReady: false });
      await serial.port.setSignals({ requestToSend: true });
      await new Promise((resolve) => setTimeout(resolve, 200));
      await serial.port.setSignals({ requestToSend: false });
    }
  };

  let espLoaderTerminal = {
    clean() {
      let term = xtermRef.current.xterm;
      term.clear();
    },
    writeLine(data) {
      let term = xtermRef.current.xterm;
      term.writeln(data);
    },
    write(data) {
      let term = xtermRef.current.xterm;
      term.write(data)
    }
  }

  const espInfo = async () => {
    const transport = new Transport(serial.port);
    const esploader = new ESPLoader(transport, 921600, espLoaderTerminal);
    // const chip = await esploader.main_fn();
    await esploader.detect_chip();
    await esploader.flash_id();
    await esploader.run_stub()
    // await esploader.connect()
    // await esploader.flash_id()
    // await esploader.flash_size_bytes()
    // console.log(esploader.chip)
  }

  return (
    <div className={className + " flex flex-col bg-black min-h-0"}>
      <div className="grow min-h-0" ref={xtermRef} />
      <div className="flex h-7 bg-slate-700 text-white">
        {serial.isOpen ? (
          <button
            onClick={async () => {
              if (serial.isOpen) {
                await serial.closePort();
              }
            }}
            className="border-slate-500 border-2 pl-1 pr-1 pd-1"
            title="Close"
          >
            Open
          </button>
        ) : (
          <button
            onClick={async () => {
              if (!serial.isOpen) {
                await serial.openPort();
              }
            }}
            className="border-slate-500 border-2 pl-1 pr-1 pd-1"
            title="Close"
          >
            Close
          </button>
        )}
        <button
          onClick={async () => {
            if (!serial.isOpen) {
              await serial.openPort();
            }

            try {
              // eslint-disable-next-line no-constant-condition
              while (true) {
                let data = await serial.read();
                if (data) {
                  xtermRef.current.xterm.write(data)
                  continue;
                }
              }
            } catch(e) {
              console.log(e)
            }
          }}
          className="border-slate-500 border-2 pl-1 pr-1 pd-1"
          title="Start reading"
        >
          Idle
        </button>
        <div
          className="border-slate-500 border-2 pl-1 pr-1 pd-1"
          title="Current Port"
        >
          <Popover className="relative">
            <Popover.Button>
              {serial.port ? serial.portInfo(serial.port).usbId : "No Ports"}
            </Popover.Button>
            <Popover.Panel className="absolute bottom-7 bg-slate-700  w-48">
              <ul>
                {serial.isOpen ? (
                  <li className="hover:bg-slate-900 p-1 text-center">
                    <Popover.Button>Port is open</Popover.Button>
                  </li>
                ) : (
                  <>
                    {serial.ports.map((port, index) => (
                      <li
                        key={index}
                        className="hover:bg-slate-900 p-1 text-center"
                      >
                        <Popover.Button>
                          {serial.portInfo(port).usbId}
                        </Popover.Button>
                      </li>
                    ))}
                    <li className="hover:bg-slate-900 p-1 text-center">
                      <Popover.Button
                        onClick={() => {
                          serial.requestPort();
                        }}
                      >
                        Connect a new port...
                      </Popover.Button>
                    </li>
                  </>
                )}
              </ul>
            </Popover.Panel>
          </Popover>
        </div>
        <div
          className="border-slate-500 border-2 pl-1 pr-1 pd-1"
          title="Port Speed"
        >
          <Popover className="relative">
            <Popover.Button>{serial.options.baudRate}</Popover.Button>
            <Popover.Panel className="absolute bottom-7 bg-slate-700 w-24">
              <ul>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setBaudRate(1200)}
                  >
                    1200
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setBaudRate(2400)}
                  >
                    2400
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setBaudRate(4800)}
                  >
                    4800
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setBaudRate(9600)}
                  >
                    9600
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setBaudRate(115200)}
                  >
                    115200
                  </Popover.Button>
                </li>
              </ul>
            </Popover.Panel>
          </Popover>
        </div>
        <div
          className="border-slate-500 border-2 pl-1 pr-1 pd-1"
          title="Data bits"
        >
          <Popover className="relative">
            <Popover.Button>{serial.options.dataBits}</Popover.Button>
            <Popover.Panel className="absolute bottom-7 bg-slate-700 w-24">
              <ul>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button onClick={() => serial.options.setDataBits(7)}>
                    7
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button onClick={() => serial.options.setDataBits(8)}>
                    8
                  </Popover.Button>
                </li>
              </ul>
            </Popover.Panel>
          </Popover>
        </div>
        <div
          className="border-slate-500 border-2 pl-1 pr-1 pd-1"
          title="Parity"
        >
          <Popover className="relative">
            <Popover.Button>{serial.options.parity}</Popover.Button>
            <Popover.Panel className="absolute bottom-7 bg-slate-700 w-24">
              <ul>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setParity("none")}
                  >
                    none
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setParity("even")}
                  >
                    even
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setParity("odd")}
                  >
                    odd
                  </Popover.Button>
                </li>
              </ul>
            </Popover.Panel>
          </Popover>
        </div>
        <div
          className="border-slate-500 border-2 pl-1 pr-1 pd-1"
          title="Stop bits"
        >
          <Popover className="relative">
            <Popover.Button>{serial.options.stopBits}</Popover.Button>
            <Popover.Panel className="absolute bottom-7 bg-slate-700 w-24">
              <ul>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button onClick={() => serial.options.setStopBits(1)}>
                    1
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button onClick={() => serial.options.setStopBits(2)}>
                    2
                  </Popover.Button>
                </li>
              </ul>
            </Popover.Panel>
          </Popover>
        </div>
        <div className="border-slate-500 border-2 pl-1 pr-1 pd-1">
          <Popover className="relative">
            <Popover.Button>{serial.options.flowControl}</Popover.Button>
            <Popover.Panel className="absolute bottom-7 bg-slate-700 w-48">
              <ul>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setFlowControl("none")}
                  >
                    none
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => serial.options.setFlowControl("hardware")}
                  >
                    hardware
                  </Popover.Button>
                </li>
              </ul>
            </Popover.Panel>
          </Popover>
        </div>
        <div className="grow border-slate-500 border-2"></div>
        <div
          className="border-slate-500 border-2 pl-1 pr-1 pd-1"
          title="Custom Macros"
        >
          <Popover className="relative">
            <Popover.Button>Macros</Popover.Button>
            <Popover.Panel className="absolute bottom-7 bg-slate-700 w-48">
              <ul>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button onClick={() => resetEsp()}>
                    Reset ESP Device
                  </Popover.Button>
                </li>
                <li className="hover:bg-slate-900 p-1 text-center">
                  <Popover.Button
                    onClick={() => espInfo()}
                  >
                    ESP Info
                  </Popover.Button>
                </li>
              </ul>
            </Popover.Panel>
          </Popover>
        </div>
        <button
          className={`border-slate-500 border-2 pl-1 pr-1 ${
            serial.signals.dataTerminalReady ? "text-white" : "text-slate-400"
          } w-10 text-center`}
          title="Data Terminal Ready"
          onClick={() =>
            serial.signals.setDataTerminalReady(
              !serial.signals.dataTerminalReady
            )
          }
        >
          DTR
        </button>
        <button
          className={`border-slate-500 border-2 pl-1 pr-1 ${
            serial.signals.requestToSend ? "text-white" : "text-slate-400"
          } w-10 text-center`}
          title="Request to Send"
          onClick={() =>
            serial.signals.setRequestToSend(!serial.signals.requestToSend)
          }
        >
          RTS
        </button>
        <button
          className={`border-slate-500 border-2 pl-1 pr-1 ${
            serial.signals.break ? "text-white" : "text-slate-400"
          } w-10 text-center`}
          title="Break"
          onClick={() => serial.signals.setBreak(!serial.signals.break)}
        >
          BK
        </button>
        <div
          className={`border-slate-500 border-2 pl-1 pr-1 ${
            serial.signals.dataCarrierDetect ? "text-white" : "text-slate-400"
          } w-10 text-center`}
          title="Data Carrier Detect"
        >
          DCR
        </div>
        <div
          className={`border-slate-500 border-2 pl-1 pr-1 ${
            serial.signals.dataSetReady ? "text-white" : "text-slate-400"
          } w-10 text-center`}
          title="Data Set Ready"
        >
          DSR
        </div>
        <div
          className={`border-slate-500 border-2 pl-1 pr-1 ${
            serial.signals.clearToSend ? "text-white" : "text-slate-400"
          } w-10 text-center`}
          title="Clear to Send"
        >
          CTS
        </div>
        <div
          className={`border-slate-500 border-2 pl-1 pr-1 ${
            serial.signals.ringIndicator ? "text-white" : "text-slate-400"
          } w-10 text-center`}
          title="Ring Indicator"
        >
          RI
        </div>
        <div
          className="border-slate-500 border-2 pl-1 pr-1"
          title="Terminal Size"
        >
          {termCols} x {termRows}
        </div>
      </div>
    </div>
  );
}

Console.propTypes = {
  className: PropTypes.string,
};
