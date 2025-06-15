import { Component, inject, NgZone, NO_ERRORS_SCHEMA, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterExtensions, NativeScriptCommonModule } from '@nativescript/angular';
import { Page, TabView } from '@nativescript/core';

@Component({
  selector: 'demo-home',
  templateUrl: './home.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA]
})
export class HomeComponent implements OnInit {
  private _ngZone = inject(NgZone);
  // vcRef: ViewContainerRef,
  private _activeRoute = inject(ActivatedRoute);
  private _page = inject(Page);
  private _ngRouter = inject(Router);
  private _router = inject(RouterExtensions);
  tabItems: { [key: string]: { index: number; title?: string; iconSource?: string; textTransform?: string } } = {};
  private _tabs = ['start'];
  private _hasInitTab: { start?: boolean } = {};
  private _tabView: TabView;

  constructor() {
    this._initMenu();
  }

  ngOnInit() {
    this._viewTab(0);
  }

  onIndexChanged(e) {
    if (e && e.object) {
      this._tabView = <TabView>e.object;
    }
  }

  loadedTabView(args) {
    //
  }

  private _viewTab(index: number) {
    let route;
    switch (index) {
      case 0:
        if (!this._hasInitTab.start) {
          this._hasInitTab.start = true;
          route = { outlets: { startTab: ['start'] } };
        }
        break;
    }

    console.log('tab index changed:', index);
    this._ngZone.run(() => {
      if (route) {
        this._router.navigate([route], {
          animated: false,
          relativeTo: this._activeRoute,
        });
      }
    });
  }

  private _initMenu(profilePic?: string) {
    for (let i = 0; i < this._tabs.length; i++) {
      const tab = this._tabs[i];
      // console.log('================')
      // console.log(tab)
      // console.log(i);
      // console.log(tab);
      let title = '';
      switch (tab) {
        case 'start':
          title = 'Start Tab';
          break;
      }
      this.tabItems[tab] = {
        index: i,
        title,
        textTransform: 'capitalize',
      };
    }
  }
}
