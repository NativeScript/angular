import { ElementRef, Inject, Injectable, OnDestroy, Optional } from '@angular/core';
import { NavigatedData, Page, View, ViewBase } from '@nativescript/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

@Injectable()
export class PageService implements OnDestroy {
  page: Page;
  private _inPage$: BehaviorSubject<boolean>;
  private _pageEvents$ = new Subject<NavigatedData>();

  get inPage(): boolean {
    return this._inPage$.value;
  }
  get inPage$(): Observable<boolean> {
    return this._inPage$.pipe(distinctUntilChanged());
  }
  get pageEvents$(): Observable<NavigatedData> {
    return this._pageEvents$.asObservable();
  }
  constructor(@Optional() page?: Page, @Optional() elRef?: ElementRef<ViewBase>, @Optional() view?: ViewBase) {
    if (page) {
      this.page = page;
    } else {
      view = view || elRef.nativeElement;
      while (view) {
        if (view instanceof Page) {
          this.page = view;
          break;
        }
        view = view.parent;
      }
    }
    this._inPage$ = new BehaviorSubject<boolean>(!!this.page?.isLoaded);
    if (this.page) {
      this.page.on('navigatedFrom', this.pageEvent, this);
      this.page.on('navigatedTo', this.pageEvent, this);
      this.page.on('navigatingFrom', this.pageEvent, this);
      this.page.on('navigatingTo', this.pageEvent, this);
    }
  }

  ngOnDestroy() {
    if (this.page) {
      this.page.off('navigatedFrom', this.pageEvent, this);
      this.page.off('navigatedTo', this.pageEvent, this);
      this.page.off('navigatingFrom', this.pageEvent, this);
      this.page.off('navigatingTo', this.pageEvent, this);
    }
    this._inPage$.complete();
    this._pageEvents$.complete();
  }

  private pageEvent(evt: NavigatedData) {
    this._pageEvents$.next(evt);
    switch (evt.eventName) {
      case 'navigatedTo':
        this._inPage$.next(true);
        break;
      case 'navigatedFrom':
        this._inPage$.next(false);
        break;
      default:
    }
  }
}
