import { Component, computed, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { NativeScriptCommonModule } from '@nativescript/angular';
import { email, form, minLength, required } from '@angular/forms/signals';

/**
 * A real Angular 22 Signal Form. The model is a signal, validation lives in a
 * schema, and every piece of field state (value, validity, errors) is a signal
 * we read straight into the template. We bind the NativeScript TextFields to the
 * field value signals manually since the DOM `Field` directive isn't available
 * in NativeScript.
 */
@Component({
  selector: 'demo-signal-form',
  templateUrl: './signal-form-demo.component.html',
  imports: [NativeScriptCommonModule],
  schemas: [NO_ERRORS_SCHEMA],
})
export class SignalFormDemoComponent {
  readonly model = signal({ email: '', handle: '' });

  readonly f = form(this.model, (path) => {
    required(path.email);
    email(path.email);
    required(path.handle);
    minLength(path.handle, 3);
  });

  readonly emailError = computed(() => {
    const field = this.f.email();
    if (!field.touched() || field.valid()) return '';
    if (field.getError('required')) return 'Email is required';
    if (field.getError('email')) return 'That doesn’t look like an email';
    return 'Invalid';
  });

  readonly handleError = computed(() => {
    const field = this.f.handle();
    if (!field.touched() || field.valid()) return '';
    if (field.getError('required')) return 'Handle is required';
    if (field.getError('minLength')) return 'At least 3 characters';
    return 'Invalid';
  });

  onEmail(args: any) {
    this.f.email().value.set(args?.object?.text ?? '');
    this.f.email().markAsTouched();
  }

  onHandle(args: any) {
    this.f.handle().value.set(args?.object?.text ?? '');
    this.f.handle().markAsTouched();
  }
}
