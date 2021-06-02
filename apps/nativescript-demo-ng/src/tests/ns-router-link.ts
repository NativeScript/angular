import { NSRouterLink } from '@nativescript/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterExtensions } from '@nativescript/angular';
import { fake, spy, stub } from './test-config';
import { SinonStub } from 'sinon';
import { Label } from '@nativescript/core';

describe('NSRouterLink', () => {
  const mockRouter = {} as Router;
  let mockRouterExtensions = {
    navigateByUrl: fake(),
    navigate: fake(),
  };
  const mockActivatedRoute = {} as ActivatedRoute;
  let nsRouterLink: NSRouterLink;
  let urlTreeStub: SinonStub;

  beforeEach(() => {
    const el = {
      nativeElement: new Label(),
    };
    nsRouterLink = new NSRouterLink(null, mockRouter, (mockRouterExtensions as unknown) as RouterExtensions, mockActivatedRoute, el);
    urlTreeStub = stub(nsRouterLink, 'urlTree').get(() => null);
  });

  afterEach(() => {
    urlTreeStub.restore();
  });

  it('#tap should call navigate with undefined transition in extras when boolean is given for pageTransition input', () => {
    nsRouterLink.pageTransition = false;
    nsRouterLink.onTap();
    expect(mockRouterExtensions.navigate.lastCall.args[1].transition).toBeUndefined();
    // assert.isUndefined(mockRouterExtensions.navigateByUrl.lastCall.args[1].transition);
  });

  it('#tap should call navigate with correct transition in extras when NavigationTransition object is given for pageTransition input', () => {
    const pageTransition = {
      name: 'slide',
      duration: 500,
    };
    nsRouterLink.pageTransition = pageTransition;
    stub(nsRouterLink, 'urlTree').get(() => null);
    nsRouterLink.onTap();
    expect(mockRouterExtensions.navigate.lastCall.args[1].transition).toBe(pageTransition);
  });
});
