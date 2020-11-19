import { ContentView, View, ProxyViewContainer, GridLayout, Color, Application } from '@nativescript/core';

export class AppHostView extends ContentView {
	private _ngAppRoot: View;
	private _content: View;
	private timeout: any = -1;

	constructor(backgroundColor: Color) {
		super();
		this.backgroundColor = backgroundColor;
	}

	get ngAppRoot(): View {
		return this._ngAppRoot;
	}

	set ngAppRoot(value: View) {
		this._ngAppRoot = value;
    }
    //@ts-ignore
	get content(): View {
		return this._content;
	}

	set content(value: View) {
		if (this._content) {
			this._content.parentNode = undefined;
		}

		this._content = value;

		if (value) {
			this._content.parentNode = this;
		}

		this.ngAppRoot = value;

		if (this._content instanceof ProxyViewContainer) {
			const grid = new GridLayout();
			grid.backgroundColor = this.backgroundColor;
			grid.addChild(this._content);
			this.ngAppRoot = grid;
		}
		if(this.ngAppRoot) {
			// maybe use this approach
			// this.scheduleRootChange();
		}
	}

	scheduleRootChange() {
		if(this.timeout === -1) {
			this.timeout = setTimeout(() => {
				//console.log(this.ngAppRoot);
				Application.resetRootView({
					create: () => this.content
				});
				this.timeout = -1;
			}, 0);
		}
	}
}

export class AppHostAsyncView extends GridLayout {
	constructor(backgroundColor: Color) {
		super();
		this.backgroundColor = backgroundColor;
	}

	get ngAppRoot(): View {
		return this;
	}

	set ngAppRoot(value: View) {
		// ignored
	}
}
