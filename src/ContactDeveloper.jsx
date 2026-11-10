import { useRef } from "react";

export default function ContactDeveloper({ onSend }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const subjectRef = useRef(null);

  const openDialog = () => {
    dialogRef.current.showModal();
    subjectRef.current.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const sent = onSend({
      subject: fields.get("subject"),
      information: fields.get("information"),
      from: fields.get("from"),
    });
    if (sent !== false) dialogRef.current.close();
  };

  return (
    <>
      <button ref={triggerRef} type="button" className="link-button contact-trigger" onClick={openDialog}>
        Contact developer
      </button>
      <dialog
        ref={dialogRef}
        className="contact-dialog"
        aria-labelledby="contact-title"
        aria-describedby="contact-description"
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current.close();
        }}
      >
        <div className="contact-heading">
          <h2 id="contact-title">Contact developer</h2>
          <button
            type="button"
            className="contact-close"
            aria-label="Close contact form"
            onClick={() => dialogRef.current.close()}
          >
            &times;
          </button>
        </div>
        <p id="contact-description" className="contact-description">
          All fields are optional. Your email app will open so you can send your message.
        </p>
        <form className="contact-form" onSubmit={handleSubmit}>
          <label htmlFor="contact-subject">Subject</label>
          <input ref={subjectRef} id="contact-subject" name="subject" type="text" />

          <label htmlFor="contact-information">Information</label>
          <textarea id="contact-information" name="information" rows="5" />

          <label htmlFor="contact-from">From</label>
          <input id="contact-from" name="from" type="text" placeholder="Your name or email" />

          <button type="submit" className="contact-send">Open email app</button>
        </form>
      </dialog>
    </>
  );
}
