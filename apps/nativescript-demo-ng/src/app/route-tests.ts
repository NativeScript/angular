import { Component, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { Frame } from '@nativescript/core';

let navNumber = 0;

@Component({
  template: `
    <StackLayout>
      <Label [text]="'Nav ' + this.navNumber"></Label>
      <Button text="click me" (tap)="navigate()"></Button>
      <Button text="Go back twice" (tap)="goBack(4)"></Button>
    </StackLayout>
  `,
})
export class Nav1Component implements OnDestroy {
  router = inject(RouterExtensions);

  frame = inject(Frame);
  activatedRoute = inject(ActivatedRoute);
  navNumber = +this.activatedRoute.snapshot.url.toString()[this.activatedRoute.snapshot.url.toString().length - 1];

  constructor() {
    // if(navNumber === 0) {
    //     this.router.router.events.subscribe((evt) => {
    //         console.log(evt);
    //     })
    // }
    // navNumber++;
  }

  ngOnDestroy() {
    const myNavNumber = this.navNumber;
    console.log(`nav${myNavNumber} destroy`);
  }

  navigate() {
    const myNavNumber = this.navNumber;
    console.log(`nav${myNavNumber} navigate`);
    console.log(`/nav${(this.navNumber % 3) + 1}`);
    this.router.navigate([`/nav${(this.navNumber % 3) + 1}`]);
  }

  goBack(times: number) {
    // if (this.frame.backStack.length >= times) {
    //   const entry = this.frame.backStack[this.frame.backStack.length - times];
    //   this.frame.goBack(entry);
    // }
    this.router.back({
      numberOfBackNavigations: times,
    });
  }
}
