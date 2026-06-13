import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Model } from '@flowable/forms';
import { AUTH_HEADER } from '../api/client';
import { useFormDebug } from '../context/FormDebugContext';
import { useMenuRefresh } from '../context/MenuRefreshContext';
import { FlwForm } from './FlwForm';
import type { TaskHeader } from '../types';
import './Task.css';

function formatDate(value: string | undefined): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function hasRenderableForm(form: Model.FormLayout | undefined): boolean {
  return Array.isArray(form?.rows) && (form.rows?.length ?? 0) > 0;
}

export function Task() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { trigger: triggerRefresh } = useMenuRefresh();
  const { debug } = useFormDebug();

  const [isLoading, setIsLoading] = useState(true);
  const [hasForm, setHasForm] = useState(false);
  const [taskHeader, setTaskHeader] = useState<TaskHeader | undefined>();
  const [formProps, setFormProps] = useState<Model.CommonFormProps | undefined>();
  const [payload, setPayload] = useState<Model.Payload>({});

  useEffect(() => {
    if (!taskId) return;

    setIsLoading(true);
    setHasForm(false);
    setTaskHeader(undefined);
    setFormProps(undefined);
    setPayload({});

    const controller = new AbortController();
    const headers = { Authorization: AUTH_HEADER };

    Promise.all([
      fetch(`/core-api/tasks/${taskId}/form`, { headers, signal: controller.signal })
        .then((r) => r.json() as Promise<Model.FormLayout>)
        .catch(() => ({} as Model.FormLayout)),
      fetch(`/platform-api/tasks/${taskId}`, { headers, signal: controller.signal })
        .then((r) => r.json())
        .catch(() => ({})),
      fetch(`/core-api/tasks/${taskId}/variables`, { headers, signal: controller.signal })
        .then((r) => r.json() as Promise<Model.Payload>)
        .catch(() => ({})),
    ]).then(([form, taskDetails, variables]) => {
      setIsLoading(false);
      setPayload(variables);
      setHasForm(hasRenderableForm(form));
      setTaskHeader({
        name: (taskDetails as { name?: string }).name ?? 'Task',
        assignee: (taskDetails as { assignee?: string }).assignee ?? 'Unassigned',
        dueDate: formatDate((taskDetails as { dueDate?: string }).dueDate),
        createdDate: formatDate((taskDetails as { createTime?: string }).createTime),
      });

      form.outcomes = form.outcomes ?? [{ label: 'Complete', value: '__COMPLETE' }];

      setFormProps({
        config: form,
        onOutcomePressed: (outcomePayload: Model.Payload, result: unknown) => {
          void fetch(`/core-api/tasks/${taskId}/complete`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...outcomePayload, outcome: result }),
          }).then(() => {
            triggerRefresh();
            void navigate('/');
          });
        },
      });
    }).catch((err) => {
      if ((err as Error).name !== 'AbortError') {
        setIsLoading(false);
      }
    });

    return () => { controller.abort(); };
  }, [taskId, triggerRefresh, navigate]);

  const completeWithoutForm = () => {
    if (!taskId) return;
    void fetch(`/core-api/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: '__COMPLETE' }),
    }).then(() => {
      triggerRefresh();
      void navigate('/');
    });
  };

  return (
    <>
      {taskHeader && (
        <section className="task-header">
          <div className="task-header__title">{taskHeader.name}</div>
          <div className="task-header__item">
            <span className="task-header__label">Assignee</span>
            <span className="task-header__value">{taskHeader.assignee}</span>
          </div>
          <div className="task-header__item">
            <span className="task-header__label">Due Date</span>
            <span className="task-header__value">{taskHeader.dueDate}</span>
          </div>
          <div className="task-header__item">
            <span className="task-header__label">Created</span>
            <span className="task-header__value">{taskHeader.createdDate}</span>
          </div>
        </section>
      )}

      {isLoading && (
        <div className="no-form-state">
          <p>Loading task form...</p>
        </div>
      )}

      {!isLoading && hasForm && formProps && (
        <FlwForm props={formProps} payload={payload} debug={debug} />
      )}

      {!isLoading && !hasForm && (
        <div className="no-form-state">
          <p>No form is available for this task.</p>
          <button
            type="button"
            className="flw__component__button flw__component--button flw__component--primary__button"
            onClick={completeWithoutForm}
          >
            Complete
          </button>
        </div>
      )}
    </>
  );
}
