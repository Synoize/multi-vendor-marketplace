import { useRef, useState } from "react";
import { Star, ImagePlus, X, Loader } from "lucide-react";
import { useReviewStore } from "@/store/reviewStore";
import { compressImage, validateReviewImages } from "@/lib/compressImage";
import { toast } from "sonner";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function ReviewModal({ product, orderItemId, onClose, onSuccess }) {
  const fileRef = useRef(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (e) => {
    const files = e.target.files;
    if (!files.length) return;
    const { valid, errors } = validateReviewImages(files, 5);
    if (errors.length) errors.forEach((msg) => toast.error(msg));
    if (valid.length) {
      setImages((prev) => [...prev, ...valid].slice(0, 5));
      const newUrls = valid.slice(0, 5 - images.length).map((f) =>
        URL.createObjectURL(f),
      );
      setPreviews((prev) => [...prev, ...newUrls].slice(0, 5));
    }
    e.target.value = "";
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (rating === 0) return toast.error("Please select a star rating");
    if (images.length === 0)
      return toast.error("Please add at least one photo to your review");
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("rating", rating);
      if (orderItemId) formData.append("orderItemId", orderItemId);
      if (title.trim()) formData.append("title", title.trim());
      if (comment.trim()) formData.append("comment", comment.trim());
      for (const file of images) {
        formData.append("images", await compressImage(file));
      }
      await useReviewStore.getState().submitReview(product.id, formData);
      toast.success("Review submitted!");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 min-w-0">
            {product?.primary_image && (
              <img
                src={product.primary_image}
                alt=""
                className="w-9 h-9 rounded-lg object-cover border border-gray-100"
              />
            )}
            <h3 className="font-bold text-gray-900 text-sm truncate">
              Review {product?.name}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(star)}
                className="p-0.5"
              >
                <Star
                  strokeWidth={1}
                  className={`h-7 w-7 transition-colors ${
                    star <= (hover || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-xs font-medium text-gray-700 ml-1">
                {RATING_LABELS[rating]}
              </span>
            )}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Review title (optional)"
            className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-secondary-600 transition-all"
          />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write your review (optional)"
            rows={3}
            className="w-full border rounded-xl px-3 py-2.5 text-xs outline-none focus:border-secondary-600 resize-none transition-all"
          />

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleSelect}
            className="hidden"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={images.length >= 5}
              className="flex items-center gap-1.5 text-xs text-primary border rounded-xl px-4 py-2.5 hover:bg-secondary transition-colors disabled:opacity-40"
            >
              <ImagePlus strokeWidth={1.5} className="h-4 w-4" />
              Add Photos ({images.length}/5) *
            </button>
          </div>

          {previews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {previews.map((url, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-200"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <X className="h-2.5 w-2.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting || rating === 0 || images.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader className="h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}