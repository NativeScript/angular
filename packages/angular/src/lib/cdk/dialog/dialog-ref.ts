import { Observable, Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { NativeModalRef } from './native-modal-ref';

// Counter for unique dialog ids.
let uniqueId = 0;

/**
 * Safety-net delay before `afterClosed` is forced when the native dismissal never reports
 * completion (e.g. the parent view is destroyed mid-animation). Must exceed the longest
 * modal dismiss animation, including custom transitions, so it can't preempt a normal
 * close — the 'closed' state emitted after the native dismissal is the real trigger.
 */
const CLOSE_FALLBACK_TIMEOUT = 5000;

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

  /** Handle to the safety-net timeout in case the native dismissal never reports completion. */
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

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

    this._nativeModalRef.stateChanged
      .pipe(
        filter((event) => event.state === 'closing'),
        take(1)
      )
      .subscribe(() => {
        this._beforeClosed.next(dialogResult);
        this._beforeClosed.complete();
        this._nativeModalRef.dispose();

        this._closeFallbackTimeout = setTimeout(() => {
          this._finishDialogClose();
          this._afterClosed.next(this._result);
          this._afterClosed.complete();
        }, CLOSE_FALLBACK_TIMEOUT);
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
