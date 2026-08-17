import { NgView } from './views';

/**
 * Implemented by {@link ViewUtil}. The controller is intentionally decoupled
 * from ViewUtil (it only knows this interface) so we don't create a circular
 * import between the renderer and the view utilities.
 */
export interface VisualTreeFlusher {
  flushVisualAdd(parent: NgView, child: NgView): void;
}

/**
 * Batches native side-effects produced while Angular is running change
 * detection and applies them in a single pass when CD finishes.
 *
 * Only operations that touch the *native* layer are deferred:
 *  - native property/style/class application
 *  - attaching a view to the native (visual) tree, which is what triggers a
 *    view to actually load (create its native view + measure/layout)
 *
 * The *logical* tree (parentNode/firstChild/nextSibling/...) is always kept in
 * sync synchronously by {@link ViewUtil}, because Angular reads it back during
 * the same CD pass. We never defer that.
 *
 * Benefits of deferring to the end of CD:
 *  - a view created and removed within the same CD never loads natively at all
 *  - a freshly built subtree is attached (and therefore loaded) exactly once,
 *    instead of loading incrementally as each child is appended to a live parent
 *  - native property writes happen once, while the view is still unloaded
 */
export class DeferredRendererOps {
  private _deferring = false;
  get deferring(): boolean {
    return this._deferring;
  }

  /** Ordered native property/style/class/value writes. */
  private ops: Array<() => void> = [];
  /** parent -> set of children awaiting native attach, plus the owning flusher. */
  private visualAdds = new Map<NgView, { flusher: VisualTreeFlusher; children: Set<NgView> }>();

  /** Open a new deferral window. Flushes any leftovers from a CD pass that threw. */
  begin(): void {
    if (this.ops.length || this.visualAdds.size) {
      // A previous tick threw between begin() and end(); apply what it queued
      // before starting a fresh window so nothing is lost.
      this.flush();
    }
    this._deferring = true;
  }

  queueOp(op: () => void): void {
    this.ops.push(op);
  }

  queueVisualAdd(parent: NgView, child: NgView, flusher: VisualTreeFlusher): void {
    let entry = this.visualAdds.get(parent);
    if (!entry) {
      entry = { flusher, children: new Set<NgView>() };
      this.visualAdds.set(parent, entry);
    }
    entry.children.add(child);
  }

  /** Cancel a pending attach (the child was removed/moved before the flush). */
  cancelVisualAdd(parent: NgView, child: NgView): void {
    const entry = this.visualAdds.get(parent);
    if (entry && entry.children.delete(child) && entry.children.size === 0) {
      this.visualAdds.delete(parent);
    }
  }

  /** Apply every queued native operation, then clear the window. */
  flush(): void {
    this._deferring = false;
    const ops = this.ops;
    const visualAdds = this.visualAdds;
    this.ops = [];
    this.visualAdds = new Map();

    // 1) Apply native properties first, while views are still unloaded, so the
    //    subsequent attach loads each view with its final property values.
    for (let i = 0; i < ops.length; i++) {
      ops[i]();
    }

    // 2) Attach subtrees. For each parent, walk its (now final) logical child
    //    list right-to-left so that when we attach a child, its next visual
    //    sibling (the insertion anchor) is already in the native tree.
    for (const [parent, entry] of visualAdds) {
      let node = parent.lastChild;
      while (node) {
        if (entry.children.has(node)) {
          entry.flusher.flushVisualAdd(parent, node);
        }
        node = node.previousSibling;
      }
    }
  }
}
