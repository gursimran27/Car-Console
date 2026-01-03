import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-ready-screen',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './ready-screen.component.html',
    styleUrl: './ready-screen.component.css'
})
export class ReadyScreenComponent {
    @Output() ready = new EventEmitter<void>();

    onTap() {
        this.ready.emit();
    }
}
