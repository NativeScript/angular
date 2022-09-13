import { fromEvent, Observable, Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { NativeModalRef } from './native-modal-ref';

// Counter for unique dialog ids.
let uniqueId = 0;

/** Possible states of the lifecycle of a dialog. */
export const enum NativeDialogState {
  OPEN,
  CLOSING,
  CLOSED,
}

export class NativeDialogRef<T, R = any> {
  /** The instance of component opened into the dialog. */
  componentInstance: T;

  /** Whether the user is allowed to close the dialog. */
  disableClose: boolean | undefined; //= this._containerInstance._config.disableClose;

  /** Subject for notifying the user that the dialog has finished opening. */
  private readonly _afterOpened = new Subject<void>();

  /** Subject for notifying the user that the dialog has finished closing. */
  private readonly _afterClosed = new Subject<R | undefined>();

  /** Subject for notifying the user that the dialog has started closing. */
  private readonly _beforeClosed = new Subject<R | undefined>();

  /** Result to be passed to afterClosed. */
  private _result: R | undefined;

  /** Handle to the timeout that's running as a fallback in case the exit animation doesn't fire. */
  private _closeFallbackTimeout: any;

  /** Current state of the dialog. */
  private _state = NativeDialogState.OPEN;

  constructor(private _nativeModalRef: NativeModalRef, readonly id: string = `native-dialog-${uniqueId++}`) {
    // Pass the id along to the container.
    _nativeModalRef._id = id;

    // Emit when opening animation completes
    _nativeModalRef.stateChanged
      .pipe(
        filter((event) => event.state === 'opened'),
        take(1)
      )
      .subscribe(() => {
        this._afterOpened.next();
        this._afterOpened.complete();
      });

    // Dispose overlay when closing animation is complete
    _nativeModalRef.stateChanged
      .pipe(
        filter((event) => event.state === 'closed'),
        take(1)
      )
      .subscribe(() => {
        clearTimeout(this._closeFallbackTimeout);
        this._finishDialogClose();
        this._afterClosed.next(this._result);
        this._afterClosed.complete();
      });

    _nativeModalRef.onDismiss.subscribe(() => {
      this._beforeClosed.next(this._result);
      this._beforeClosed.complete();

      this.componentInstance = null!;
      _nativeModalRef.dispose();
    });
  }

  /**
   * Close the dialog.
   * @param dialogResult Optional result to return to the dialog opener.
   */
  close(dialogResult?: R): void {
    this._result = dialogResult;

    // Transition the backdrop in parallel to the dialog.
    this._nativeModalRef.stateChanged
      .pipe(
        filter((event) => event.state === 'closing'),
        take(1)
      )
      .subscribe((event) => {
        this._beforeClosed.next(dialogResult);
        this._beforeClosed.complete();
        this._nativeModalRef.dispose();
        // this._overlayRef.detachBackdrop();

        // The logic that disposes of the overlay depends on the exit animation completing, however
        // it isn't guaranteed if the parent view is destroyed while it's running. Add a fallback
        // timeout which will clean everything up if the animation hasn't fired within the specified
        // amount of time plus 100ms. We don't need to run this outside the NgZone, because for the
        // vast majority of cases the timeout will have been cleared before it has the chance to fire.
        this._closeFallbackTimeout = setTimeout(
          () => {
            this._finishDialogClose();
            this._afterClosed.next(this._result);
            this._afterClosed.complete();
          },
          //event.totalTime + 100);
          100
        );
      });

    this._state = NativeDialogState.CLOSING;
    this._nativeModalRef._startExitAnimation();
  }

  /**
   * Gets an observable that is notified when the dialog is finished opening.
   */
  afterOpened(): Observable<void> {
    return this._afterOpened;
  }

  /**
   * Gets an observable that is notified when the dialog is finished closing.
   */
  afterClosed(): Observable<R | undefined> {
    return this._afterClosed;
  }

  /**
   * Gets an observable that is notified when the dialog has started closing.
   */
  beforeClosed(): Observable<R | undefined> {
    return this._beforeClosed;
  }

  /**
   * Gets an observable that emits when the overlay's backdrop has been clicked.
   */
  backdropClick(): Observable<MouseEvent> {
    throw new Error('Method not implemented');
  }

  /** Add a CSS class or an array of classes to the overlay pane. */
  addPanelClass(classes: string | string[]): this {
    // this._overlayRef.addPanelClass(classes);
    return this;
  }

  /** Remove a CSS class or an array of classes from the overlay pane. */
  removePanelClass(classes: string | string[]): this {
    // this._overlayRef.removePanelClass(classes);
    return this;
  }

  /** Gets the current state of the dialog's lifecycle. */
  getState(): NativeDialogState {
    return this._state;
  }

  /**
   * Finishes the dialog close by updating the state of the dialog
   * and disposing the overlay.
   */
  private _finishDialogClose() {
    this._state = NativeDialogState.CLOSED;
    this._nativeModalRef.dispose();
  }
}
