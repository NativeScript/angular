import { XhrFactory } from '@angular/common';
import { Injectable } from '@angular/core';

@Injectable()
export class NativescriptXhrFactory extends XhrFactory {
  build() {
    return new XMLHttpRequest();
  }
}
