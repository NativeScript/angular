// make sure you import mocha-config before @angular/core
import { NSFileSystem } from '@nativescript/angular';
import { NsHttpBackEnd } from '@nativescript/angular';

import { HttpRequest, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { XhrFactory } from '@angular/common';
import { File } from '@nativescript/core/file-system';

class NSFileSystemMock implements NSFileSystem {
  public currentApp(): any {
    return { path: '/app/dir' };
  }

  public fileFromPath(path: string): any {
    if (path === '/app/dir/data.json') {
      return {
        readText: () => {
          return Promise.resolve(` { "result": "success" } `);
        },
      };
    }
    throw new Error('Opening non-existing file');
  }

  public fileExists(path: string): boolean {
    return path === '/app/dir/data.json';
  }
}
class XhrFactoryMock implements XhrFactory {
  build(): XMLHttpRequest {
    throw new Error('Hi, from XhrFactoryMock!');
  }
}

describe('NsHttpBackEnd ', () => {
  let backend: NsHttpBackEnd;

  beforeEach(() => {
    backend = new NsHttpBackEnd(new XhrFactoryMock(), new NSFileSystemMock());
  });

  it("should work with local files prefixed with '~'", (done) => {
    const req = new HttpRequest('GET', '~/data.json');
    let nextCalled = false;
    backend.handle(req).subscribe(
      (response: HttpResponse<{ result: string }>) => {
        expect(response.body.result).toEqual('success');
        nextCalled = true;
      },
      (error) => {
        fail(error);
      },
      () => {
        expect(nextCalled).withContext('next callback should be called with result.').toBe(true);
        done();
      }
    );
  });

  it("should return 404 for non-existing local files prefixed with '~'", (done) => {
    const req = new HttpRequest('GET', '~/non/existing/file.json');
    backend.handle(req).subscribe(
      (response) => {
        fail('next callback should not be called for non existing file.');
      },
      (error: HttpErrorResponse) => {
        expect(error.status).toBe(404);
        done();
      },
      () => {
        fail('next callback should not be called for non existing file.');
      }
    );
  });

  it('should fallback to XHR backend when requesting remote files', (done) => {
    const req = new HttpRequest('GET', 'https://nativescript.org/');
    backend.handle(req).subscribe(
      (response) => {
        fail('next callback should not be called for non existing file.');
      },
      (error: Error) => {
        expect(error.message).toEqual('Hi, from XhrFactoryMock!');
        done();
      },
      () => {
        fail('next callback should not be called for non existing file.');
      }
    );
  });
});
