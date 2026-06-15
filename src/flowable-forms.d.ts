declare module '@flowable/forms/index-complete.js' {
  import type { Model } from '@flowable/forms';

  interface RenderedForm {
    destroy: () => void;
    form: Promise<unknown>;
  }

  export type FormProps = Model.CommonFormProps & {
    payload?: Model.Payload;
    debug?: boolean;
    onChange?: (payload: Model.Payload, changed?: unknown) => void;
  };

  export function render(element: HTMLElement, props: FormProps): RenderedForm;
}
