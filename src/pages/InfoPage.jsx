import { Link } from "react-router-dom";

function InfoPage({ title, description, children }) {
  return (
    <section className="max-w-3xl mx-auto">
      <div className="bg-card border border-border rounded-lg p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
        {description ? <p className="text-muted-foreground mb-6">{description}</p> : null}
        <div className="space-y-4 text-sm text-muted-foreground leading-7">{children}</div>
        <div className="mt-8">
          <Link to="/" className="text-accent hover:underline text-sm font-medium">
            Ve trang chu
          </Link>
        </div>
      </div>
    </section>
  );
}

export function AboutPage() {
  return (
    <InfoPage
      title="Gioi thieu MI Truyen"
      description="MI Truyen la nen tang doc truyen online mien phi, cap nhat nhanh va toi uu cho di dong."
    >
      <p>Chung toi tap trung vao trai nghiem doc de chiu, toc do nhanh, va de dang tim truyen theo the loai.</p>
      <p>Neu ban la tac gia hoac don vi quang cao, vui long lien he: contact@mitruyen.com.</p>
    </InfoPage>
  );
}

export function PrivacyPage() {
  return (
    <InfoPage
      title="Chinh sach bao mat"
      description="Trang nay duoc su dung cho muc dich minh bach du lieu va yeu cau tich hop quang cao."
    >
      <p>MI Truyen co the su dung cookie de luu dang nhap, cai dat doc, va phan tich luot su dung co ban.</p>
      <p>Google Ads co the su dung cookie rieng de hien thi quang cao phu hop voi nguoi dung.</p>
      <p>Ban co the tat cookie trong trinh duyet, tuy nhien mot so tinh nang co the bi anh huong.</p>
    </InfoPage>
  );
}

export function TermsPage() {
  return (
    <InfoPage title="Dieu khoan su dung" description="Khi su dung MI Truyen, ban dong y voi cac dieu khoan duoi day.">
      <p>Khong sao chep, phat tan noi dung vi pham ban quyen.</p>
      <p>Khong su dung dich vu vao muc dich gay hai, spam hoac tan cong he thong.</p>
      <p>Chung toi co quyen dieu chinh noi dung va tinh nang de dam bao chat luong dich vu.</p>
    </InfoPage>
  );
}

export function ContactPage() {
  return (
    <InfoPage title="Lien he" description="Can ho tro tai khoan, noi dung, hoac quang cao?">
      <p>Email: contact@mitruyen.com</p>
      <p>Thoi gian phan hoi du kien: 24-72 gio lam viec.</p>
    </InfoPage>
  );
}
