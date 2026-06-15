import { useEffect, useRef, useState } from 'react';
import type { FormProps } from '@flowable/forms/index-complete.js';

interface FlwFormProps {
  props: FormProps;
  payload?: import('@flowable/forms').Model.Payload;
  debug?: boolean;
}

export function FlwForm({ props, payload = {}, debug = false }: FlwFormProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderVersionRef = useRef(0);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const version = ++renderVersionRef.current;
    let destroyForm: (() => void) | undefined;
    let isActive = true;

    setRenderError('');

    void import('@flowable/forms/index-complete.js').then(({ render }) => {
      if (!isActive || !containerRef.current || version !== renderVersionRef.current) return;

      try {
        const rendered = render(containerRef.current, { ...props, payload, debug });

        if (!isActive || version !== renderVersionRef.current) {
          rendered.destroy();
          return;
        }

        destroyForm = rendered.destroy;

        rendered.form.catch((error: unknown) => {
          if (version !== renderVersionRef.current) return;
          setRenderError(error instanceof Error ? error.message : String(error));
        });
      } catch (error) {
        if (version !== renderVersionRef.current) return;
        setRenderError(error instanceof Error ? error.message : String(error));
      }
    });

    return () => {
      isActive = false;
      destroyForm?.();
    };
  }, [props, payload, debug]);

  return (
    <>
      {renderError && (
        <div style={{ padding: '12px', border: '1px solid #c00', color: '#900', marginBottom: '12px' }}>
          Flowable form render error: {renderError}
        </div>
      )}
      <div ref={containerRef} style={{ minHeight: '24px' }} />
    </>
  );
}
