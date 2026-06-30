# EX500 Nomogram Assistant

Alcon WaveLight EX500 수술 계획값을 검산하기 위한 정적 웹 계산기입니다. `index.html`을 바로 열거나 GitHub Pages에 올려 사용할 수 있습니다.

## 포함된 계산 프로파일

- **EX500/Wellington 표**: 첨부 사진의 Wellington Clinic FDA Nomogram 표를 기반으로 myopia sphere/cylinder band를 적용합니다. Cylinder가 있는 myopic refraction에서는 사진 하단 문구에 따라 sphere component에 `-0.25 D`를 추가합니다.
- **20-25% cylinder 표**: 첨부 사진 2의 myopia/hyperopia/mixed astigmatism 규칙을 기반으로 cylinder를 20-25% 감산합니다.
- **Contoura Vision modified**: Alcon Contoura Vision Training Card의 modified cylinder/sphere 계산 순서를 구현했습니다. Refraction cylinder와 measured cylinder/axis의 mismatch가 큰 경우 Wavefront Optimized 고려 경고를 표시합니다.

## 연령 보정

연령별 보정은 병원 outcome audit에 따라 달라질 수 있어 보수적으로만 넣었습니다. 기본 preset은 근시/근시성 난시 기준으로만 자동 적용됩니다.

| Age | Sphere preset |
| --- | ---: |
| 18-29 | -0.25 D |
| 30-39 | 0.00 D |
| 40-44 | 0.00 D |
| 45-49 | +0.25 D |
| 50+ | +0.25 D |

이 방향은 고도근시 LASIK에서 나이가 술후 결과에 미묘하지만 유의하게 영향을 주며, 젊은 환자는 더 큰 attempted correction, 고령 환자는 더 작은 intended correction이 도움이 될 수 있다는 연구를 우선 반영한 것입니다. 다만 다른 regression 연구에서는 older age가 myopic regression/retreatment 위험과도 관련됩니다. 그래서 0.25 D를 넘지 않는 preset으로 두고, hyperopia/mixed astigmatism에는 자동 연령 보정을 적용하지 않습니다. 화면의 **연령별 sphere 보정** 표에 병원 outcome audit 값을 입력하고 저장하면 브라우저 localStorage에 저장됩니다.

## 참고한 근거

- FDA PMA P020050: WaveLight Allegretto Wave Excimer Laser System 원 PMA의 myopic LASIK 범위와 18세 이상/1년 안정성 기준.
  https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P020050
- FDA PMA P020050/S012: Topography-guided T-CAT LASIK의 myopia/astigmatism 범위와 안정성 기준.
  https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=P020050S012
- FDA SSED PDF for P020050/S012.
  https://www.accessdata.fda.gov/cdrh_docs/pdf2/P020050S012B.pdf
- FDA LASIK patient guidance: 굴절 불안정성, 상처 치유 질환/약물, 각막확장증, 얇은 각막, 건성안 등 수술 전 확인 포인트.
  https://www.fda.gov/medical-devices/lasik/when-lasik-not-me
- Luger MHA, Ewering T, Arba-Mosquera S. Influence of patient age on high myopic correction in corneal laser refractive surgery. J Cataract Refract Surg. 2013.
  https://pubmed.ncbi.nlm.nih.gov/23332251/
- Mimouni M, Vainer I, Shapira Y, et al. Factors Predicting the Need for Retreatment After Laser Refractive Surgery. Cornea. 2016.
  https://pubmed.ncbi.nlm.nih.gov/26967106/
- Choi RY, Lee W, Alio Del Barrio JL, et al. Predictors affecting myopic regression in -6.0D to -10.0D myopia after LASEK/LASIK. Int Ophthalmol. 2020.
  https://pubmed.ncbi.nlm.nih.gov/31571091/
- Preoperative risk factor study for myopic regression after LASIK/PRK/KLEx. Cornea. 2025.
  https://pubmed.ncbi.nlm.nih.gov/40199570/
- Influence of preoperative parameters on delta K per attempted SEQ in LASIK/PRK/SMILE. Clin Ophthalmol. 2023.
  https://pubmed.ncbi.nlm.nih.gov/37662649/
- Local source: `18ALZ023-Contoura-Training-Card-HiRes.2.0.0.pdf`, Contoura Vision Training Card en-us Rev.00, 2019-01-22, Item No. 6675 2022.
- Local source: 사용자가 제공한 Wellington Clinic FDA Nomogram 사진 2장.

원본 PDF와 사진은 저작권/배포 범위 확인이 필요하므로 저장소에 포함하지 않는 것을 권장합니다. `.gitignore`에는 `*.pdf`와 `tmp/`를 제외하도록 넣어 두었습니다.

## 주의

이 저장소는 chart entry와 nomogram 검산을 돕는 계산 보조 도구입니다. 독립적인 진단/치료 결정 도구가 아니며, 실제 수술 결정에는 국내 허가사항, 장비 labeling, topography quality, optical zone, ablation depth, residual stromal bed, PTA, cyclotorsion/registration quality, 환자별 위험 요인을 별도로 확인해야 합니다.

## 로컬 테스트

Node.js가 있으면 계산 엔진 테스트를 실행할 수 있습니다.

```powershell
node tests/nomogram.test.js
```

## GitHub Pages 배포

1. 이 폴더를 GitHub 저장소로 올립니다.
2. Repository Settings > Pages에서 branch를 선택합니다.
3. Source를 repository root로 지정하면 `index.html`이 계산기 첫 화면으로 열립니다.
