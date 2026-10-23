import { copyModalHostProps, ModalHostView, shareModalHostProps } from './modal-host';

class FakeView implements ModalHostView {
  _dialogFragment?: unknown;
  viewController?: unknown;
  children: FakeView[] = [];
  fragmentsAtAdd: unknown[] = [];

  eachChildView(callback: (child: ModalHostView) => boolean): void {
    this.children.every((child) => callback(child) !== false);
  }

  _addView(view: ModalHostView): void {
    this.fragmentsAtAdd.push(view._dialogFragment);
    this.children.push(view as FakeView);
  }
}

function tree() {
  const wrapper = new FakeView();
  const host = new FakeView();
  const label = new FakeView();
  wrapper.children = [host];
  host.children = [label];
  return { wrapper, host, label };
}

describe('modal host props', () => {
  it('copies the wrapper props onto every descendant', () => {
    const { wrapper, host, label } = tree();
    wrapper._dialogFragment = { kind: 'fragment' };
    wrapper.viewController = { kind: 'controller' };

    copyModalHostProps(wrapper, wrapper);

    for (const view of [host, label]) {
      expect(view._dialogFragment).toBe(wrapper._dialogFragment);
      expect(view.viewController).toBe(wrapper.viewController);
    }
  });

  it('leaves descendants alone when the wrapper has no host props', () => {
    const { wrapper, label } = tree();
    const own = { kind: 'own' };
    label._dialogFragment = own;

    copyModalHostProps(wrapper, wrapper);

    expect(label._dialogFragment).toBe(own);
  });

  it('stamps views the component host gains later, before they are added', () => {
    const { wrapper, host } = tree();
    wrapper._dialogFragment = { kind: 'fragment' };
    shareModalHostProps(wrapper, host);

    const replacement = new FakeView();
    host._addView(replacement);

    expect(host.fragmentsAtAdd).toEqual([wrapper._dialogFragment]);
    expect(host.children).toContain(replacement);
  });

  it('patches a host only once', () => {
    const { wrapper, host } = tree();
    shareModalHostProps(wrapper, host);
    const patched = host._addView;
    shareModalHostProps(wrapper, host);
    expect(host._addView).toBe(patched);
  });
});
