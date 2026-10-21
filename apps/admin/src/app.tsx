// product: the console's P0 placeholder. The live stream, the devices tab, the test matrix,
// device control, the HMI preview and the latency panel all arrive at P3, and every one of them
// reads the frozen contract, which does not exist yet.
export const CONSOLE_TITLE = "Parth Developer Console";
export const CONSOLE_NOTE = "P0 placeholder. Internal only; never shipped to a customer.";

export function App(): React.JSX.Element {
  return (
    <main>
      <h1>{CONSOLE_TITLE}</h1>
      <p>{CONSOLE_NOTE}</p>
    </main>
  );
}
