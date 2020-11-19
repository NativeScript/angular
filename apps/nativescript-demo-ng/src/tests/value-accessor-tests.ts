// make sure you import mocha-config before @angular/core
import { ElementRef } from '@angular/core';
import { CheckedValueAccessor, DateValueAccessor, NumberValueAccessor, SelectedIndexValueAccessor, TextValueAccessor, TimeValueAccessor } from '@nativescript/angular';
import { DatePicker, ListPicker, Slider, Switch, TextField, TimePicker, View } from '@nativescript/core';

class TestElementRef implements ElementRef {
  constructor(public nativeElement: View) {}
}

class TestNumberValueAccessor extends NumberValueAccessor {
  constructor() {
    super(new TestElementRef(new Slider()));
  }
}

class TestCheckedValueAccessor extends CheckedValueAccessor {
  constructor() {
    super(new TestElementRef(new Switch()));
  }
}

class TestDateValueAccessor extends DateValueAccessor {
  constructor() {
    super(new TestElementRef(new DatePicker()));
  }
}

class TestSelectedIndexValueAccessor extends SelectedIndexValueAccessor {
  constructor() {
    super(new TestElementRef(TestSelectedIndexValueAccessor.picker()));
  }

  static picker(): ListPicker {
    const picker = new ListPicker();
    picker.items = ['1', '2', '3', '4', '5'];
    return picker;
  }
}

class TestTimeValueAccessor extends TimeValueAccessor {
  constructor() {
    super(new TestElementRef(new TimePicker()));
  }
}

class TestTextValueAccessor extends TextValueAccessor {
  constructor() {
    super(new TestElementRef(new TextField()));
  }
}

describe('two-way binding via ng-model', () => {
  it('converts strings to numbers', () => {
    const accessor = new TestNumberValueAccessor();
    const defaultValue = accessor.view.value;

    accessor.writeValue(null);
    expect(accessor.view.value).withContext('setting null should keep the default value').toBe(defaultValue);

    accessor.writeValue('42');
    expect(accessor.view.value).toBe(42);

    accessor.writeValue('blah');
    expect(accessor.view.value).withContext('defaults to NaN on parse errors').toBeNaN();

    accessor.writeValue(null);
    expect(accessor.view.value).withContext('setting null should reset the value').toBe(defaultValue);
  });

  it('converts strings to bools', () => {
    const accessor = new TestCheckedValueAccessor();
    const defaultValue = accessor.view.checked;

    accessor.writeValue(null);
    expect(accessor.view.checked).withContext('setting null should keep the default value').toBe(false);

    accessor.writeValue('true');
    expect(accessor.view.checked).toBe(true);

    accessor.writeValue(null);
    expect(accessor.view.checked).withContext('setting null should reset the value').toBe(defaultValue);

    expect(() => accessor.writeValue('blah')).toThrow();
  });

  it('converts strings to dates', () => {
    const accessor = new TestDateValueAccessor();
    const defaultDate = accessor.view.date; // current date time

    expect(accessor.view.date).toBeInstanceOf(Date);
    let diff = Math.abs(accessor.view.date.getTime() - defaultDate.getTime());
    expect(diff < 1000)
      .withContext('setting null should reset the value')
      .toBeTrue();

    accessor.writeValue('2010/03/17');
    expect(formatDate(accessor.view.date)).toBe(formatDate(new Date(2010, 2, 17)));

    accessor.writeValue(null);
    expect(accessor.view.date).toBeInstanceOf(Date);
    diff = Math.abs(accessor.view.date.getTime() - defaultDate.getTime());
    expect(diff < 1000)
      .withContext('setting null should reset the value')
      .toBeTrue();
  });

  it('converts strings to int selection', () => {
    const accessor = new TestSelectedIndexValueAccessor();
    const defaultValue = accessor.view.selectedIndex;

    accessor.writeValue(null);
    accessor.ngAfterViewInit();
    expect(accessor.view.selectedIndex).withContext('setting null should keep the default value').toBe(defaultValue);

    accessor.writeValue('3');
    accessor.ngAfterViewInit();
    expect(accessor.view.selectedIndex).toBe(3);

    accessor.writeValue(null);
    expect(accessor.view.selectedIndex).withContext('setting null should reset the value').toBe(defaultValue);

    accessor.writeValue('blah');
    accessor.ngAfterViewInit();
    expect(accessor.view.selectedIndex).withContext('default to NaN on parse errors').toBeNaN();
  });

  it('converts strings to times', () => {
    const accessor = new TestTimeValueAccessor();

    expect(() => accessor.writeValue('2010/03/17 12:54')).toThrow();
    expect(() => accessor.writeValue('three hours from now')).toThrow();
  });

  it('converts values to text', () => {
    const accessor = new TestTextValueAccessor();
    const defaultValue = accessor.view.text;

    accessor.writeValue(null);
    expect(accessor.view.text).withContext('setting null should keep the default value').toBe(defaultValue);

    accessor.writeValue('blah');
    expect(accessor.view.text).toBe('blah');

    accessor.writeValue(null);
    expect(accessor.view.text).withContext('setting null should reset the value').toBe(defaultValue);

    accessor.writeValue({ toString: () => 'stringified' });
    expect(accessor.view.text).toEqual('stringified');
  });
});

function formatDate(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function formatTime(date: Date) {
  return `${date.getHours()}:${date.getMinutes()}`;
}
