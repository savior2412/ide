import './App.css';
import FileExplorer from './components/FileExplorer/FileExplorer';
import MainPanel from './components/MainPanel/MainPanel';
import AssistantPanel from './components/AssistantPanel/AssistantPanel';

function App() {
  return (
    <div className="app-container">
      {/* Cột Trái */}
      <div className="app-container__sidebar">
        <FileExplorer />
      </div>

      {/* Cột Giữa */}
      <main className="app-container__main">
        <MainPanel />
      </main>

      {/* Cột Phải: Sử dụng component AssistantPanel */}
      <div className="app-container__assistant">
        <AssistantPanel />
      </div>
    </div>
  );
}

export default App;