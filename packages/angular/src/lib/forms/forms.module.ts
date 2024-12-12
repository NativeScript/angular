import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextValueAccessor, CheckedValueAccessor, DateValueAccessor, TimeValueAccessor, NumberValueAccessor, SelectedIndexValueAccessor } from './value-accessors';

export * from './value-accessors';

@NgModule({
  providers: [],
  imports: [FormsModule, TextValueAccessor, CheckedValueAccessor, DateValueAccessor, TimeValueAccessor, SelectedIndexValueAccessor, NumberValueAccessor],
  exports: [FormsModule, TextValueAccessor, CheckedValueAccessor, DateValueAccessor, TimeValueAccessor, SelectedIndexValueAccessor, NumberValueAccessor],
})
export class NativeScriptFormsModule {}
