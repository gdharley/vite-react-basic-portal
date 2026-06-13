declare module '@flowable/forms/index-complete.js' {
  import type { Model } from '@flowable/forms';

  interface RenderedForm {
    destroy: () => void;
    form: Promise<unknown>;
  }

  export function render(
    element: HTMLElement,
    props: Model.CommonFormProps & { payload?: Model.Payload; debug?: boolean }
  ): RenderedForm;
}
