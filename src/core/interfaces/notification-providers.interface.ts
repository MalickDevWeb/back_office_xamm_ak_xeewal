export interface IEmailProvider {
  sendEmail(to: string, subject: string, text: string, html?: string): Promise<boolean>;
}

export interface ISmsProvider {
  sendSms(phoneNumber: string, message: string): Promise<boolean>;
}

export interface IPushProvider {
  sendPushToMember(memberId: string, payload: { title: string; body: string }): Promise<boolean>;
}
