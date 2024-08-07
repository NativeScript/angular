import { ApplicationRef, ChangeDetectorRef, Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, Injector, NO_ERRORS_SCHEMA, OnDestroy, TemplateRef, Type, ViewChild, ViewContainerRef } from '@angular/core';
import { ProxyViewContainer, Trace } from '@nativescript/core';
import { registerElement } from '../element-registry';
import type { ComponentType } from '../utils/general';
import { ComponentPortal, TemplatePortal } from './portal';

registerElement('DetachedContainer', () => ProxyViewContainer, {
  skipAddToDom: true,
});

/**
 * Wrapper component used for loading components when navigating
 * It uses DetachedContainer as selector so that it is containerRef is not attached to
 * the visual tree.
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'DetachedContainer',
  template: `<Placeholder #loader></Placeholder>
    <ng-container #vc></ng-container>
    <ng-content></ng-content>`,
  standalone: true,
  schemas: [NO_ERRORS_SCHEMA],
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class DetachedLoader implements OnDestroy {
  @ViewChild('vc', { read: ViewContainerRef, static: true }) vc: ViewContainerRef;
  private disposeFunctions: Array<() => void> = [];
  // tslint:disable-line:component-class-suffix
  constructor(private resolver: ComponentFactoryResolver, private changeDetector: ChangeDetectorRef, private containerRef: ViewContainerRef, private appRef: ApplicationRef) {}

  public createComponentPortal<T>(componentType: ComponentType<T>, customInjector?: Injector) {
    return new ComponentPortal(componentType, this.vc, customInjector || this.vc.injector);
  }

  public createTemplatePortal<T>(templateRef: TemplateRef<T>, context?: T) {
    return new TemplatePortal(templateRef, this.vc, context);
  }

  private loadInAppRef(componentType: Type<any>): ComponentRef<any> {
    const factory = this.resolver.resolveComponentFactory(componentType);
    const componentRef = factory.create(this.containerRef.injector);
    this.appRef.attachView(componentRef.hostView);

    this.disposeFunctions.push(() => {
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
    });

    // Component is created, built may not be checked if we are loading
    // inside component with OnPush CD strategy. Mark us for check to be sure CD will reach us.
    // We are inside a promise here so no need for setTimeout - CD should trigger
    // after the promise.
    Trace.write('DetachedLoader.loadInLocation component loaded -> markForCheck', 'detached-loader');

    return componentRef;
  }

  private loadInLocation(componentType: Type<any>): ComponentRef<any> {
    return this.vc.createComponent(componentType);
  }

  public ngOnDestroy() {
    this.disposeFunctions.forEach((fn) => fn());
  }

  public detectChanges() {
    this.changeDetector.markForCheck();
  }

  /**
   * @deprecated use Portals
   */
  public loadComponent(componentType: Type<any>): Promise<ComponentRef<any>> {
    Trace.write('DetachedLoader.loadComponent', 'detached-loader');
    return Promise.resolve(this.loadInAppRef(componentType));
  }

  /**
   * @deprecated use Portals
   */
  public loadComponentSync(componentType: Type<any>): ComponentRef<any> {
    Trace.write('DetachedLoader.loadComponentSync', 'detached-loader');
    return this.loadInAppRef(componentType);
  }

  /**
   * @deprecated use Portals
   */
  public loadComponentInLocation(componentType: Type<any>): ComponentRef<any> {
    Trace.write('DetachedLoader.loadComponentInLocation', 'detached-loader');
    return this.loadInLocation(componentType);
  }

  /**
   * @deprecated use Portals
   */
  public loadWithFactory<T>(factory: ComponentFactory<T>): ComponentRef<T> {
    const componentRef = factory.create(this.containerRef.injector);
    this.appRef.attachView(componentRef.hostView);

    this.disposeFunctions.push(() => {
      this.appRef.detachView(componentRef.hostView);
      componentRef.destroy();
    });
    return componentRef;
  }

  /**
   * @deprecated use Portals
   */
  public loadWithFactoryInLocation<T>(factory: ComponentFactory<T>): ComponentRef<T> {
    return this.vc.createComponent(factory);
  }
}
