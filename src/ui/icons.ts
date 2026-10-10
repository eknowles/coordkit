import type { Html, HtmlBuilder } from 'foldkit/html'

/** The cross used for the map cursor, matching the CSS cursor in styles.css. */
export const crossIconView = <Message>(h: HtmlBuilder<Message>): Html =>
  h.svg(
    [
      h.ViewBox('0 0 24 24'),
      h.Class('h-4 w-4 shrink-0 text-ink'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('2'),
      h.StrokeLinecap('round'),
      h.AriaHidden(true),
    ],
    [
      h.line([h.X1('12'), h.Y1('2'), h.X2('12'), h.Y2('9')]),
      h.line([h.X1('12'), h.Y1('15'), h.X2('12'), h.Y2('22')]),
      h.line([h.X1('2'), h.Y1('12'), h.X2('9'), h.Y2('12')]),
      h.line([h.X1('15'), h.Y1('12'), h.X2('22'), h.Y2('12')]),
    ],
  )

/** The ring used for the cue, matching the cue marker on the map. */
export const cueIconView = <Message>(h: HtmlBuilder<Message>): Html =>
  h.svg(
    [h.ViewBox('0 0 24 24'), h.Class('h-4 w-4 shrink-0 text-cue'), h.AriaHidden(true)],
    [
      h.circle([h.Cx('12'), h.Cy('12'), h.R('7'), h.Fill('none'), h.Stroke('currentColor'), h.StrokeWidth('3')]),
      h.circle([h.Cx('12'), h.Cy('12'), h.R('2'), h.Fill('currentColor')]),
    ],
  )

/** The GitHub mark (Octicons, MIT). */
export const githubIconView = <Message>(h: HtmlBuilder<Message>): Html =>
  h.svg(
    [h.ViewBox('0 0 16 16'), h.Class('h-4 w-4'), h.Fill('currentColor'), h.AriaHidden(true)],
    [
      h.path([
        h.D(
          'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z',
        ),
      ]),
    ],
  )

/** Three sliders, for the map settings menu. */
export const settingsIconView = <Message>(h: HtmlBuilder<Message>): Html =>
  h.svg(
    [
      h.ViewBox('0 0 16 16'),
      h.Class('h-4 w-4'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
      h.StrokeLinecap('round'),
      h.AriaHidden(true),
    ],
    [
      h.path([h.D('M2 4h12M2 8h12M2 12h12')]),
      h.circle([h.Cx('5'), h.Cy('4'), h.R('1.6'), h.Fill('#18181b')]),
      h.circle([h.Cx('11'), h.Cy('8'), h.R('1.6'), h.Fill('#18181b')]),
      h.circle([h.Cx('7'), h.Cy('12'), h.R('1.6'), h.Fill('#18181b')]),
    ],
  )
