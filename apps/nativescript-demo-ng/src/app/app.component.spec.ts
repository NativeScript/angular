import { TestBed } from '@angular/core/testing';
import { NativeScriptCommonModule, NativeScriptModule } from '@nativescript/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [NativeScriptModule, NativeScriptCommonModule, AppRoutingModule],
      providers: [],
    });
    return TestBed.compileComponents();
  });
  it('creates', function () {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows message', function () {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.message).toEqual('Hello Angular!');
  });
});
