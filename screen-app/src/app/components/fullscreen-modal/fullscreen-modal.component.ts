import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-fullscreen-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './fullscreen-modal.component.html',
    styleUrl: './fullscreen-modal.component.css'
})
export class FullscreenModalComponent {
    @Output() selection = new EventEmitter<'FULL' | 'WINDOW'>();

    select(mode: 'FULL' | 'WINDOW') {
        this.selection.emit(mode);
    }
}
