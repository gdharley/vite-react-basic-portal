import { useEffect, useRef, useState } from 'react';
import type { Model } from '@flowable/forms';
import type { FormProps } from '@flowable/forms/index-complete.js';
import { AUTH_HEADER } from '../api/client';
import { useFormDebug } from '../context/FormDebugContext';
import { FlwForm } from './FlwForm';
import type { App, MenuItem } from '../types';
import './AppModal.css';


function ProcessIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"/>
      <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52z"/>
    </svg>
  );
}

function CaseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M6.5 1A1.5 1.5 0 0 0 5 2.5V3H1.5A1.5 1.5 0 0 0 0 4.5v8A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 14.5 3H11v-.5A1.5 1.5 0 0 0 9.5 1zm0 1h3a.5.5 0 0 1 .5.5V3H6v-.5a.5.5 0 0 1 .5-.5M1.5 4h13a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5"/>
    </svg>
  );
}

function hasRenderableForm(form: Record<string, unknown>): boolean {
  return Array.isArray(form['rows']) && (form['rows'] as unknown[]).length > 0;
}

type ModalView = 'gallery' | 'loading' | 'form';

interface AppModalProps {
  app: App;
  onClose: () => void;
  onWorkStarted: () => void;
}

export function AppModal({ app, onClose, onWorkStarted }: AppModalProps) {
  const [view, setView] = useState<ModalView>('gallery');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [formProps, setFormProps] = useState<FormProps | undefined>();
  const [search, setSearch] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const { debug } = useFormDebug();
  const dialogRef = useRef<HTMLDivElement>(null);
  const latestPayloadRef = useRef<Model.Payload>({});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    fetch('/idm-api/current-user', { headers: { Authorization: AUTH_HEADER } })
      .then((r) => r.ok ? r.json() : Promise.resolve(null))
      .then((user: { id?: string } | null) => { if (user?.id) setCurrentUserId(user.id); })
      .catch(() => undefined);
  }, []);

  const startWork = (item: MenuItem, payload: Model.Payload, outcome: unknown) => {
    const isCase = item.type === 'case';
    const url = isCase ? '/platform-api/case-instances' : '/platform-api/process-instances';
    const variables = { initiator: currentUserId, ...payload };
    const body = isCase
      ? { ...variables, outcome, caseDefinitionId: item.id }
      : { ...variables, outcome, processDefinitionId: item.id };

    void fetch(url, {
      method: 'POST',
      headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(() => {
      onWorkStarted();
      onClose();
    });
  };

  const handleItemClick = (item: MenuItem) => {
    setSelectedItem(item);
    setView('loading');
    latestPayloadRef.current = {};

    const startFormUrl = item.type === 'case'
      ? `/platform-api/case-definitions/${item.id}/start-form`
      : `/platform-api/process-definitions/${item.id}/start-form`;

    fetch(startFormUrl, {
      headers: { Authorization: AUTH_HEADER },
    })
      .then((r) => (r.ok ? r.json() : Promise.resolve({})))
      .then((formLayout: Record<string, unknown>) => {
        if (hasRenderableForm(formLayout)) {
          formLayout['outcomes'] = formLayout['outcomes'] ?? [{ label: 'Start', value: '__START' }];
          setFormProps({
            config: formLayout as Model.FormLayout,
            onChange: (updatedPayload: Model.Payload) => {
              latestPayloadRef.current = updatedPayload;
            },
            onOutcomePressed: (outcomePayload: Model.Payload, result: unknown) => {
              const payload = outcomePayload && Object.keys(outcomePayload).length > 0
                ? outcomePayload
                : latestPayloadRef.current;
              startWork(item, payload, result);
            },
          });
          setView('form');
        } else {
          startWork(item, {}, '__START');
        }
      })
      .catch(() => {
        startWork(item, {}, '__START');
      });
  };

  const goBack = () => {
    setView('gallery');
    setSelectedItem(null);
    setFormProps(undefined);
    setSearch('');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-dialog"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          {view === 'form' && (
            <button type="button" className="modal-back" onClick={goBack} aria-label="Back to gallery">
              ← Back
            </button>
          )}
          <h2 className="modal-title">
            {view === 'form' && selectedItem ? selectedItem.name : app.name}
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {view === 'gallery' && (
            <>
              <input
                type="search"
                className="gallery-search"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            <div className="work-gallery">
              {app.items
                .filter((item) => !search.trim() || item.name.toLowerCase().includes(search.trim().toLowerCase()))
                .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`gallery-item gallery-item--${item.type ?? 'process'}`}
                  onClick={() => handleItemClick(item)}
                >
                  <div className="gallery-item__icon">
                    {item.type === 'case' ? <CaseIcon /> : <ProcessIcon />}
                  </div>
                  <span className="gallery-item__name">{item.name}</span>
                </button>
              ))}
            </div>
            </>
          )}

          {view === 'loading' && (
            <div className="modal-loading">
              <p>Loading form…</p>
            </div>
          )}

          {view === 'form' && formProps && (
            <FlwForm props={formProps} debug={debug} />
          )}
        </div>
      </div>
    </div>
  );
}
