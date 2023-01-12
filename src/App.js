import "./App.css";
import { Console } from "./components/Console";

function App() {
  return (
      <div className="h-screen flex w-full flex-col">
        <Console className="grow shrink" />
      </div>
  );
}

export default App;
