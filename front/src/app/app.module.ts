import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { PhotographComponent } from './components/photograph/photograph.component';
import { VideotapeComponent } from './components/videotape/videotape.component';
import { QueueComponent } from './components/queue/queue.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { ProgressBarComponent } from './components/progress-bar/progress-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    PhotographComponent,
    VideotapeComponent,
    QueueComponent,
    ProgressBarComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
