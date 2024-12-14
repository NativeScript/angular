import type { ResolveFn } from '@angular/router';
import { of } from 'rxjs';

export const dummyDataResolverTsResolver: ResolveFn<string[]> = (route, state) => {
  return of(['Name1', 'Name2', "Name3"]);
};
