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
            Về trang chủ
          </Link>
        </div>
      </div>
    </section>
  );
}

export function AboutPage() {
  return (
    <InfoPage
      title="Giới thiệu Mi Truyện"
      description="mitruyen.me là nền tảng đọc truyện online miễn phí, cập nhật nhanh và tối ưu cho di động."
    >
      <p>
        Chúng tôi tập trung vào trải nghiệm đọc dễ chịu, tốc độ nhanh, và dễ dàng tìm truyện theo thể loại.
      </p>
      <p>
        Nếu bạn là tác giả hoặc đơn vị quảng cáo, vui lòng liên hệ: contact.mitruyen@gmail.com.
      </p>
    </InfoPage>
  );
}

export function PrivacyPage() {
  return (
    <InfoPage
      title="Chính sách bảo mật"
      description="Trang này được sử dụng cho mục đích minh bạch dữ liệu và yêu cầu tích hợp quảng cáo."
    >
      <p>
        Mi Truyện (mitruyen.me) có thể sử dụng cookie để lưu đăng nhập, cài đặt đọc và phân tích lượt sử dụng cơ bản.
      </p>
      <p>Google Ads có thể sử dụng cookie riêng để hiển thị quảng cáo phù hợp với người dùng.</p>
      <p>Bạn có thể tắt cookie trong trình duyệt; tuy nhiên một số tính năng có thể bị ảnh hưởng.</p>
    </InfoPage>
  );
}

export function TermsPage() {
  return (
    <InfoPage
      title="Điều khoản sử dụng"
      description="Khi sử dụng mitruyen.me, bạn đồng ý với các điều khoản dưới đây."
    >
      <p>Không sao chép, phát tán nội dung vi phạm bản quyền.</p>
      <p>Không sử dụng dịch vụ vào mục đích gây hại, spam hoặc tấn công hệ thống.</p>
      <p>Chúng tôi có quyền điều chỉnh nội dung và tính năng để đảm bảo chất lượng dịch vụ.</p>
    </InfoPage>
  );
}

export function ContactPage() {
  return (
    <InfoPage title="Liên hệ" description="Cần hỗ trợ tài khoản, nội dung hoặc quảng cáo?">
      <p>Email: contact.mitruyen@gmail.com</p>
      <p>Thời gian phản hồi dự kiến: 24–72 giờ làm việc.</p>
    </InfoPage>
  );
}
