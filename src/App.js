import "./App.scss";
import Calculator from "./Calculator";

function App() {
  return (
    <div className="App">
      <div className="Sticky-outer">
        <div className="Sticky-expand container">
          <header className="App-header">
            <h1>Creator Frame Fixture Setup Calculator</h1>
          </header>
          <section>
            <Calculator />
          </section>
        </div>
        <footer className="App-footer">
          Made by{" "}
          <a href="https://andrewsuzuki.com" title="Andrew Suzuki">
            Andrew Suzuki
          </a>{" "}
          &middot;{" "}
          <a
            href="https://github.com/andrewsuzuki/cobra-framebuilding-creator-calculator"
            title="Source code on GitHub"
          >
            Source
          </a>
        </footer>
      </div>
    </div>
  );
}

export default App;
