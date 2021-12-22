import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, CanLoad, Route, Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class BootGuardService implements CanActivate, CanLoad {
  public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  public canLoad(route: Route): Promise<boolean> {
    return this.canActivate(null, null);
  }
}
