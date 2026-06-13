import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AUTH_HEADER } from '../api/client';
import { useMenuRefresh } from '../context/MenuRefreshContext';
import type { MenuItem } from '../types';
import './Menu.css';

function extractArray(result: unknown): unknown[] {
  if (typeof result === 'string') {
    try { return extractArray(JSON.parse(result)); } catch { return []; }
  }
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (r['body']) return extractArray(r['body']);
    if (Array.isArray(r['data'])) return r['data'] as unknown[];
    if (Array.isArray(r['content'])) return r['content'] as unknown[];
    if (r['_embedded'] && typeof r['_embedded'] === 'object') {
      const emb = r['_embedded'] as Record<string, unknown>;
      if (Array.isArray(emb['data'])) return emb['data'] as unknown[];
      if (Array.isArray(emb['processDefinitions'])) return emb['processDefinitions'] as unknown[];
      if (Array.isArray(emb['tasks'])) return emb['tasks'] as unknown[];
    }
  }
  if (Array.isArray(result)) return result as unknown[];
  return [];
}

function extractItems(result: unknown): MenuItem[] {
  return extractArray(result)
    .map((item) => {
      const i = item as Record<string, unknown>;
      return {
        id: String(i['id'] ?? i['key'] ?? i['processDefinitionId'] ?? ''),
        name: String(i['name'] ?? i['processDefinitionName'] ?? i['title'] ?? i['key'] ?? i['id'] ?? ''),
      };
    })
    .filter((item) => item.id.length > 0);
}

export function Menu() {
  const [tasks, setTasks] = useState<MenuItem[]>([]);
  const [processes, setProcesses] = useState<MenuItem[]>([]);
  const [taskSearch, setTaskSearch] = useState('');
  const [processSearch, setProcessSearch] = useState('');
  const { subscribe } = useMenuRefresh();
  const location = useLocation();

  const loadTasks = useCallback(() => {
    const controller = new AbortController();
    fetch('/platform-api/search/tasks?filterId=open', {
      headers: { Authorization: AUTH_HEADER },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setTasks(extractItems(data)))
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') console.error('Failed to load tasks', err);
      });
    return controller;
  }, []);

  const loadProcesses = useCallback(() => {
    const controller = new AbortController();
    fetch('/process-api/repository/process-definitions?latest=true', {
      headers: { Authorization: AUTH_HEADER },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => setProcesses(extractItems(data)))
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') console.error('Failed to load processes', err);
      });
    return controller;
  }, []);

  useEffect(() => {
    const taskCtrl = loadTasks();
    const processCtrl = loadProcesses();

    const interval = setInterval(() => { loadTasks(); }, 10000);
    const unsubscribe = subscribe(() => {
      loadTasks();
      loadProcesses();
    });

    return () => {
      taskCtrl.abort();
      processCtrl.abort();
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadTasks, loadProcesses, subscribe]);

  const isActiveTask = (item: MenuItem) => {
    const match = location.pathname.match(/\/task\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) === item.id : false;
  };

  const isActiveProcess = (item: MenuItem) => {
    const match = location.pathname.match(/\/process\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) === item.id : false;
  };

  const filteredTasks = tasks.filter(
    (t) => !taskSearch.trim() || t.name.toLowerCase().includes(taskSearch.trim().toLowerCase())
  );

  const filteredProcesses = processes.filter(
    (p) => !processSearch.trim() || p.name.toLowerCase().includes(processSearch.trim().toLowerCase())
  );

  return (
    <>
      <section className="menu-section">
        <h2 className="menu-heading">
          <span className="menu-heading__label">Tasks</span>
          <span className="menu-heading__count">{tasks.length}</span>
        </h2>
        <input
          type="search"
          className="menu-search"
          value={taskSearch}
          onChange={(e) => setTaskSearch(e.target.value)}
          placeholder="Search tasks"
        />
        <div className="menu-list">
          {filteredTasks.map((task) => (
            <Link
              key={task.id}
              to={`/task/${task.id}`}
              className={isActiveTask(task) ? 'active' : undefined}
            >
              {task.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="menu-section">
        <h2 className="menu-heading">
          <span className="menu-heading__label">Processes</span>
          <span className="menu-heading__count">{processes.length}</span>
        </h2>
        <input
          type="search"
          className="menu-search"
          value={processSearch}
          onChange={(e) => setProcessSearch(e.target.value)}
          placeholder="Search processes"
        />
        <div className="menu-list">
          {filteredProcesses.map((process) => (
            <Link
              key={process.id}
              to={`/process/${process.id}`}
              className={isActiveProcess(process) ? 'active' : undefined}
            >
              {process.name}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
