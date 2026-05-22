import { NSRouterLink, NativeScriptRouterModule } from '@nativescript/angular';
import { RouterExtensions } from '@nativescript/angular';
import { fake } from './test-config.spec';
import { Component, ViewChild } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { NativeScriptModule } from '@nativescript/angular';

@Component({
  imports: [NativeScriptRouterModule, NSRouterLink],
  template: `<Label nsRouterLink="/test" text="Test"></Label>`,
})
class RouterLinkTestComponent {
  @ViewChild(NSRouterLink, { static: false }) nsRouterLink: NSRouterLink;
}

describe('NSRouterLink', () => {
  let mockNavigate: ReturnType<typeof fake>;
  let fixture: ComponentFixture<RouterLinkTestComponent>;

  beforeEach(async () => {
    mockNavigate = fake();
    TestBed.configureTestingModule({
      imports: [
        NativeScriptModule,
        NativeScriptRouterModule.forRoot([{ path: 'test', component: RouterLinkTestComponent }]),
        RouterLinkTestComponent,
      ],
      providers: [
        {
          provide: RouterExtensions,
          useValue: {
            navigateByUrl: fake(),
            navigate: mockNavigate,
          },
        },
      ],
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(RouterLinkTestComponent);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('#tap should call navigate with undefined transition in extras when boolean is given for pageTransition input', () => {
    const directive = fixture.componentInstance.nsRouterLink;
    directive.pageTransition = false;
    directive['onTap']();
    expect(mockNavigate.lastCall.args[1].transition).toBeUndefined();
  });

  it('#tap should call navigate with correct transition in extras when NavigationTransition object is given for pageTransition input', () => {
    const pageTransition = {
      name: 'slide',
      duration: 500,
    };
    const directive = fixture.componentInstance.nsRouterLink;
    directive.pageTransition = pageTransition;
    directive['onTap']();
    expect(mockNavigate.lastCall.args[1].transition).toBe(pageTransition);
  });
});
