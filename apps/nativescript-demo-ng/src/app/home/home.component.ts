import { Component, NgZone } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { Page, TabView } from '@nativescript/core';

@Component({
  moduleId: module.id,
  selector: 'demo-home',
  templateUrl: './home.component.html',
})
export class HomeComponent {
  tabItems: { [key: string]: { index: number; title?: string; iconSource?: string; textTransform?: string } } = {};
  private _tabs = ['start'];
  private _hasInitTab: { start?: boolean } = {};

  constructor(
    private _ngZone: NgZone,
    // vcRef: ViewContainerRef,
    private _activeRoute: ActivatedRoute,
    private _page: Page,
    private _ngRouter: Router,
    private _router: RouterExtensions
  ) {
    this._initMenu();
  }

  ngOnInit() {
    this._viewTab(0);
  }

  private _tabView;
  onIndexChanged(e) {
    if (e && e.object) {
      this._tabView = <TabView>e.object;
    }
  }

  loadedTabView(args) {}

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
