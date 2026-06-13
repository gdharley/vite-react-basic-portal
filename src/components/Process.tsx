import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Model } from '@flowable/forms';
import { AUTH_HEADER } from '../api/client';
import { useFormDebug } from '../context/FormDebugContext';
import { FlwForm } from './FlwForm';
import './Task.css';

function hasRenderableForm(form: Model.FormLayout | undefined): boolean {
  return Array.isArray(form?.rows) && (form.rows?.length ?? 0) > 0;
}

export function Process() {
  const { processId } = useParams<{ processId: string }>();
  const navigate = useNavigate();
  const { debug } = useFormDebug();

  const [isLoading, setIsLoading] = useState(true);
  const [hasForm, setHasForm] = useState(false);
  const [formProps, setFormProps] = useState<Model.CommonFormProps | undefined>();
  const [processDefinitionId, setProcessDefinitionId] = useState<string | undefined>();

  useEffect(() => {
    if (!processId) return;

    setIsLoading(true);
    setHasForm(false);
    setFormProps(undefined);
    setProcessDefinitionId(processId);

    const controller = new AbortController();
    const headers = { Authorization: AUTH_HEADER };

    fetch(`/platform-api/process-definitions/${processId}/start-form`, { headers, signal: controller.signal })
      .then((r) => r.json() as Promise<Model.FormLayout>)
      .catch(() => ({} as Model.FormLayout))
      .then((formLayout) => {
        setIsLoading(false);
        setHasForm(hasRenderableForm(formLayout));
        formLayout.outcomes = formLayout.outcomes ?? [{ label: 'Create new process', value: '__CREATE' }];

        setFormProps({
          config: formLayout,
          onOutcomePressed: (outcomePayload: Model.Payload, result: unknown) => {
            void fetch('/platform-api/process-instances', {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...outcomePayload, outcome: result, processDefinitionId: processId }),
            }).then(() => {
              void navigate('/');
            });
          },
        });
      })
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') setIsLoading(false);
      });

    return () => { controller.abort(); };
  }, [processId, navigate]);

  const startWithoutForm = () => {
    if (!processDefinitionId) return;
    void fetch('/platform-api/process-instances', {
      method: 'POST',
      headers: { Authorization: AUTH_HEADER, 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: '__CREATE', processDefinitionId }),
    }).then(() => {
      void navigate('/');
    });
  };

  return (
    <>
      {isLoading && (
        <div className="no-form-state">
          <p>Loading process form...</p>
        </div>
      )}

      {!isLoading && hasForm && formProps && (
        <FlwForm props={formProps} debug={debug} />
      )}

      {!isLoading && !hasForm && (
        <div className="no-form-state">
          <p>No form is available for this process.</p>
          <button
            type="button"
            className="flw__component__button flw__component--button flw__component--primary__button"
            onClick={startWithoutForm}
          >
            Start Process
          </button>
        </div>
      )}
    </>
  );
}
