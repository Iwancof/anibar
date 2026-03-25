import app from "ags/gtk4/app"

import style from "../../style.scss"

export interface PreviewAppConfig {
  instanceName: string
  main: () => void
}

export function startPreviewApp(config: PreviewAppConfig) {
  app.start({
    instanceName: config.instanceName,
    css: style,
    main: config.main,
  })
}
