import { useRef } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useFormDebug } from './context/FormDebugContext';
import { Menu } from './components/Menu';
import { Task } from './components/Task';
import { Process } from './components/Process';
import { Welcome } from './components/Welcome';
import './App.css';

export function App() {
  const { toggle } = useFormDebug();
  const clickCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleLogoClick = () => {
    clickCountRef.current += 1;

    if (timerRef.current !== undefined) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
      timerRef.current = undefined;
    }, 1500);

    if (clickCountRef.current < 3) return;

    clickCountRef.current = 0;
    if (timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    const enabled = toggle();
    console.info(`Flowable form debug ${enabled ? 'enabled' : 'disabled'}.`);
  };

  return (
    <div className="body">
      <div>
        <img
          src="/flowable.jpg"
          width={350}
          className="logo-trigger"
          onClick={handleLogoClick}
          title="Flowable"
          alt="Flowable"
        />
      </div>
      <div className="menu">
        <Menu />
      </div>
      <div className="content">
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/task/:taskId" element={<Task />} />
          <Route path="/process/:processId" element={<Process />} />
        </Routes>
      </div>
      <br style={{ clear: 'both' }} />
    </div>
  );
}
