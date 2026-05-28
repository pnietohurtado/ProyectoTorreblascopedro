package com.example.qntrol;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

public class FaqActivity extends AppCompatActivity {

    private LinearLayout layoutFaqContainer;

    private final int[] questionResIds = {
            R.string.faq_question_scan_modes,
            R.string.faq_question_qr_not_found,
            R.string.faq_question_seat,
            R.string.faq_question_manual_check,
            R.string.faq_question_logs,
            R.string.faq_question_dark_mode
    };

    private final int[] answerResIds = {
            R.string.faq_answer_scan_modes,
            R.string.faq_answer_qr_not_found,
            R.string.faq_answer_seat,
            R.string.faq_answer_manual_check,
            R.string.faq_answer_logs,
            R.string.faq_answer_dark_mode
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        ThemeHelper.applyTheme(this);
        LanguageHelper.applyLanguage(this);
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_faq);

        layoutFaqContainer = findViewById(R.id.layoutFaqContainer);
        findViewById(R.id.btnBackFaq).setOnClickListener(v -> finish());

        renderQuestions();
    }

    private void renderQuestions() {
        LayoutInflater inflater = LayoutInflater.from(this);
        layoutFaqContainer.removeAllViews();

        for (int i = 0; i < questionResIds.length; i++) {
            View itemView = inflater.inflate(R.layout.item_faq, layoutFaqContainer, false);
            TextView tvQuestion = itemView.findViewById(R.id.tvFaqQuestion);
            TextView tvAnswer = itemView.findViewById(R.id.tvFaqAnswer);
            ImageView ivArrow = itemView.findViewById(R.id.ivFaqArrow);

            tvQuestion.setText(questionResIds[i]);
            tvAnswer.setText(answerResIds[i]);

            itemView.setOnClickListener(v -> {
                boolean isOpening = tvAnswer.getVisibility() != View.VISIBLE;
                tvAnswer.setVisibility(isOpening ? View.VISIBLE : View.GONE);
                ivArrow.animate().rotation(isOpening ? 90f : 0f).setDuration(160).start();
            });

            layoutFaqContainer.addView(itemView);
        }
    }
}
