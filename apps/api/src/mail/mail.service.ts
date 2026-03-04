import { Injectable } from "@nestjs/common"

export type MailSecureMode = "starttls" | "tls"

export type MailConfig = {
  host: string
  port: number
  secureMode: MailSecureMode
  username?: string | null
  password?: string | null
  fromName?: string | null
  fromEmail: string
}

export type MailMessage = {
  to: string
  subject: string
  html: string
}

@Injectable()
export class MailService {
  async send(config: MailConfig, message: MailMessage) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require("nodemailer")
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secureMode === "tls",
      auth:
        config.username && config.password
          ? { user: config.username, pass: config.password }
          : undefined,
    })

    const from = config.fromName
      ? `"${config.fromName.replace(/"/g, "")}" <${config.fromEmail}>`
      : config.fromEmail

    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    })
  }
}
